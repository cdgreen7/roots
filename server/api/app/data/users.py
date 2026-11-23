"""
users and friendships tables.
"""
from uuid import UUID

import asyncpg

# Columns that are safe to send to the app (everything except the password hash).
USER_COLUMNS = "id, username, name, email, created_at"


async def create_user(pool: asyncpg.Pool, username: str, name: str, email: str,
                      password_hash: str) -> asyncpg.Record:
    """
    create_user inserts a new account and returns it.
    Raises asyncpg.UniqueViolationError if the email or username is already taken.
    """
    return await pool.fetchrow(
        f"""
        INSERT INTO users (username, name, email, pw_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING {USER_COLUMNS}
        """,
        username, name, email, password_hash,
    )


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> asyncpg.Record | None:
    """
    get_user_by_email returns the account with this email, including pw_hash so the password can be checked.
    """
    return await pool.fetchrow(f"SELECT {USER_COLUMNS}, pw_hash FROM users WHERE email = $1", email)


async def are_friends(pool: asyncpg.Pool, user_id: UUID, other_id: UUID) -> bool:
    """
    are_friends returns True if the two users have an accepted friendship, in either direction.
    """
    return await pool.fetchval(
        """
        SELECT EXISTS (
            SELECT 1 FROM friendships
            WHERE status = 'accepted'
              AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        )
        """,
        user_id, other_id,
    )


async def get_user_by_username(pool: asyncpg.Pool, username: str) -> asyncpg.Record | None:
    """
    get_user_by_username returns the account with this username, ignoring case.
    """
    return await pool.fetchrow(f"SELECT {USER_COLUMNS} FROM users WHERE lower(username) = lower($1)", username)


async def get_friendship(pool: asyncpg.Pool, user_id: UUID, other_id: UUID) -> asyncpg.Record | None:
    """
    get_friendship returns the friendship row between the two users in either direction, or None.
    user_id in the row is who sent the request and friend_id is who received it.
    """
    return await pool.fetchrow(
        """
        SELECT user_id, friend_id, status FROM friendships
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        """,
        user_id, other_id,
    )


async def create_friend_request(pool: asyncpg.Pool, requester_id: UUID, recipient_id: UUID) -> None:
    """
    create_friend_request adds a pending request from requester_id to recipient_id.
    Raises asyncpg.UniqueViolationError if that request already exists.
    """
    await pool.execute(
        "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')",
        requester_id, recipient_id,
    )


async def accept_friend_request(pool: asyncpg.Pool, requester_id: UUID, recipient_id: UUID) -> bool:
    """
    accept_friend_request marks the pending request from requester_id to recipient_id as accepted.
    Returns False if there is no such pending request.
    """
    row = await pool.fetchrow(
        """
        UPDATE friendships SET status = 'accepted'
        WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
        RETURNING user_id
        """,
        requester_id, recipient_id,
    )
    return row is not None


async def list_friendships(pool: asyncpg.Pool, user_id: UUID) -> list[asyncpg.Record]:
    """
    list_friendships returns every friendship and request involving user_id, with the other user's
    id, username, and name, the status, and whether user_id sent the request (outgoing), ordered by username.
    """
    return await pool.fetch(
        """
        SELECT u.id AS user_id, u.username, u.name, f.status, f.user_id = $1 AS outgoing
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
        WHERE f.user_id = $1 OR f.friend_id = $1
        ORDER BY lower(u.username)
        """,
        user_id,
    )
