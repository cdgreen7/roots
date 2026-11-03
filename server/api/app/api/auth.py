"""
/register and /login (FR10).
"""
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ..services import auth
from .deps import Pool

router = APIRouter(tags=["accounts"])


class Register(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9_.]{3,32}$")
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(pool: Pool, body: Register):
    """Create an account. Returns {token, user}."""
    return await auth.register(pool, body.username, body.name, body.email, body.password)


@router.post("/login")
async def login(pool: Pool, body: Login):
    """Log in with email and password. Returns {token, user}."""
    return await auth.login(pool, body.email, body.password)
