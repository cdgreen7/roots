"""
/posts: share a plant update, and read friends' updates.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, UploadFile, status

from .. import config
from ..services import posts
from ..services.errors import Invalid
from .deps import CurrentUser, Pool

router = APIRouter(tags=["posts"])


@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    pool: Pool,
    user_id: CurrentUser,
    plant_id: Annotated[UUID, Form()],
    body: Annotated[str, Form(max_length=2000)] = "",
    image: Annotated[UploadFile | None, File()] = None,
):
    """
    Share an update about one of your plants. Sent as multipart/form-data (not JSON) so it can carry a photo:
    plant_id, body, and an optional JPEG, PNG, or WebP image of at most 5 MB. Returns {post_id, image_url}.
    """
    data = None
    if image is not None:
        # Read one byte past the limit so an oversized image is caught without reading all of it.
        data = await image.read(config.MAX_IMAGE_BYTES + 1)
        if len(data) > config.MAX_IMAGE_BYTES:
            raise Invalid(f"Images can be at most {config.MAX_IMAGE_BYTES // (1024 * 1024)} MB")
    return await posts.create_post(pool, user_id, plant_id, body, data)


@router.get("/posts")
async def friend_posts(pool: Pool, user_id: CurrentUser, limit: int = Query(50, ge=1, le=200)):
    """Your friends' posts, newest first: [{post_id, username, plant_name, body, image_url, created_at}]."""
    return await posts.friend_posts(pool, user_id, limit)
