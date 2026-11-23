"""
/friends: send and accept friend requests, and list friends (needed for the /posts feed).
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services import friends
from .deps import CurrentUser, Pool

router = APIRouter(tags=["friends"])


class FriendRequest(BaseModel):
    """
    FriendRequest is the body of POST /friends and POST /friends/accept.
    """
    username: str = Field(min_length=1, max_length=32)


@router.post("/friends")
async def send_request(pool: Pool, user_id: CurrentUser, body: FriendRequest):
    """
    send_request sends a friend request to a username. Returns {username, status}; status is "accepted" instead of
    "pending" if they had already sent you a request.
    """
    return await friends.send_request(pool, user_id, body.username)


@router.post("/friends/accept")
async def accept_request(pool: Pool, user_id: CurrentUser, body: FriendRequest):
    """
    accept_request accepts the friend request a username sent you. Returns {username, status}.
    """
    return await friends.accept_request(pool, user_id, body.username)


@router.get("/friends")
async def list_friends(pool: Pool, user_id: CurrentUser):
    """
    list_friends returns your friends and pending requests: {friends, incoming, outgoing},
    each [{user_id, username, name}].
    """
    return await friends.list_friends(pool, user_id)
