"""
Accounts and login tokens.
Passwords are hashed with scrypt (built into Python), and tokens are signed JSON Web Tokens (JWT)
whose subject is the user's id.
"""
import asyncio
import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg
import jwt

from .. import config
from ..data import users
from .errors import Conflict, Unauthorized

# scrypt cost settings. Stored in each hash so they can be raised later without breaking old passwords.
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
TOKEN_ALGORITHM = "HS256"


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    """
    _scrypt hashes password with the given salt and cost settings (n, r, p) and returns the 32-byte result.
    """
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, dklen=32)


def hash_password(password: str) -> str:
    """
    hash_password returns a string like "scrypt$16384$8$1$<salt>$<hash>" to store in users.pw_hash.
    """
    salt = secrets.token_bytes(16)
    digest = _scrypt(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    encode = lambda b: base64.b64encode(b).decode()
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${encode(salt)}${encode(digest)}"


def verify_password(password: str, stored: str) -> bool:
    """
    verify_password returns True if password matches a hash made by hash_password.
    """
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest)
        actual = _scrypt(password, base64.b64decode(salt), int(n), int(r), int(p))
    except ValueError:
        return False
    return hmac.compare_digest(actual, expected)


# Checked against when the email isn't registered, so a failed login takes the same time either way
# and can't be used to find out which emails have accounts.
_UNUSED_HASH = hash_password(secrets.token_urlsafe(16))


def issue_token(user_id: UUID) -> str:
    """
    issue_token returns a signed token for user_id that expires after TOKEN_LIFETIME_HOURS.
    """
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user_id), "iat": now, "exp": now + timedelta(hours=config.TOKEN_LIFETIME_HOURS)}
    return jwt.encode(claims, config.JWT_SECRET, algorithm=TOKEN_ALGORITHM)


def user_id_from_token(token: str) -> UUID:
    """
    user_id_from_token checks the token's signature and expiry and returns the user id inside it.
    Raises Unauthorized if the token is invalid or expired.
    """
    try:
        claims = jwt.decode(token, config.JWT_SECRET, algorithms=[TOKEN_ALGORITHM], options={"require": ["sub", "exp"]})
        return UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError) as e:
        raise Unauthorized("Invalid or expired token") from e


def _session(user: asyncpg.Record) -> dict:
    """
    _session builds the {token, user} response for register and login.
    """
    info = {key: user[key] for key in ("id", "username", "name", "email", "created_at")}
    return {"token": issue_token(user["id"]), "user": info}


async def register(pool: asyncpg.Pool, username: str, name: str, email: str, password: str) -> dict:
    """
    register creates an account and returns a token for it, so the app is logged in straight away.
    Raises Conflict if the email or username is already taken.
    """
    password_hash = await asyncio.to_thread(hash_password, password)
    try:
        user = await users.create_user(pool, username.strip(), name.strip(), email.strip().lower(), password_hash)
    except asyncpg.UniqueViolationError as e:
        taken = "username" if "username" in (e.constraint_name or "") else "email"
        raise Conflict(f"That {taken} is already registered") from e
    return _session(user)


async def login(pool: asyncpg.Pool, email: str, password: str) -> dict:
    """
    login returns a token if the email and password match an account.
    Raises Unauthorized otherwise, without saying which one was wrong.
    """
    user = await users.get_user_by_email(pool, email.strip().lower())
    ok = await asyncio.to_thread(verify_password, password, user["pw_hash"] if user else _UNUSED_HASH)
    if not (user and ok):
        raise Unauthorized("Wrong email or password")
    return _session(user)
