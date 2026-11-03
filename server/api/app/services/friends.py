"""
Friends: sending and accepting friend requests. Accepted friends can see each other's posts
and view each other's plant readings, alerts, and schedules.
"""
from uuid import UUID

import asyncpg

from ..data import users
from .errors import Conflict, Invalid, NotFound


async def _other_user(pool: asyncpg.Pool, user_id: UUID, username: str) -> asyncpg.Record:
    """_other_user looks up username, raising NotFound if it doesn't exist and Invalid if it is user_id."""
    other = await users.get_user_by_username(pool, username.strip())
    if other is None:
        raise NotFound("User not found")
    if other["id"] == user_id:
        raise Invalid("You can't add yourself as a friend")
    return other


async def send_request(pool: asyncpg.Pool, user_id: UUID, username: str) -> dict:
    """
    send_request asks username to be user_id's friend. If username has already asked user_id,
    this accepts their request instead, so the two become friends straight away.
    Raises Conflict if they are already friends or user_id has already asked.
    """
    other = await _other_user(pool, user_id, username)
    existing = await users.get_friendship(pool, user_id, other["id"])
    if existing is not None:
        if existing["status"] == "accepted":
            raise Conflict("You are already friends")
        if existing["user_id"] == user_id:
            raise Conflict("Friend request already sent")
        await users.accept_friend_request(pool, other["id"], user_id)
        return {"username": other["username"], "status": "accepted"}
    try:
        await users.create_friend_request(pool, user_id, other["id"])
    except asyncpg.UniqueViolationError as e:
        raise Conflict("Friend request already sent") from e
    return {"username": other["username"], "status": "pending"}


async def accept_request(pool: asyncpg.Pool, user_id: UUID, username: str) -> dict:
    """
    accept_request accepts the pending friend request username sent to user_id.
    Raises NotFound if there is no such request.
    """
    other = await _other_user(pool, user_id, username)
    if not await users.accept_friend_request(pool, other["id"], user_id):
        raise NotFound("No friend request from that user")
    return {"username": other["username"], "status": "accepted"}


async def list_friends(pool: asyncpg.Pool, user_id: UUID) -> dict:
    """
    list_friends returns {friends, incoming, outgoing}: accepted friends, requests waiting for user_id
    to accept, and requests user_id sent that haven't been accepted. Each entry is {user_id, username, name}.
    """
    result = {"friends": [], "incoming": [], "outgoing": []}
    for row in await users.list_friendships(pool, user_id):
        entry = {"user_id": row["user_id"], "username": row["username"], "name": row["name"]}
        if row["status"] == "accepted":
            result["friends"].append(entry)
        else:
            result["outgoing" if row["outgoing"] else "incoming"].append(entry)
    return result
