"""
Posts: plant updates (text and an optional photo) that users share with their friends.
Images are saved to config.UPLOAD_DIR and served by the API at config.UPLOAD_URL_PREFIX.
"""
import asyncio
import logging
import uuid
from uuid import UUID

import asyncpg

from .. import config
from ..data import posts
from .errors import Invalid
from .plants import owned_plant

log = logging.getLogger("roots.posts")


def _image_extension(image: bytes) -> str | None:
    """
    _image_extension returns the file extension for a JPEG, PNG, or WebP image, judged by its first bytes
    (not the file name or the type the app claims), or None for anything else.
    """
    if image.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if image.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if image[:4] == b"RIFF" and image[8:12] == b"WEBP":
        return "webp"
    return None


def _save_image(image: bytes, extension: str) -> str:
    """_save_image writes the image under a random name and returns that name."""
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4().hex}.{extension}"
    (config.UPLOAD_DIR / file_name).write_bytes(image)
    return file_name


async def create_post(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID, body: str,
                      image: bytes | None) -> dict:
    """
    create_post shares an update about one of the user's plants. It needs some text, an image, or both.
    Raises Invalid if both are empty, or the image is too large or not a JPEG, PNG, or WebP.
    """
    await owned_plant(pool, user_id, plant_id)
    body = body.strip()
    if not body and not image:
        raise Invalid("A post needs text or an image")

    image_url = None
    file_name = None
    if image:
        if len(image) > config.MAX_IMAGE_BYTES:
            raise Invalid(f"Images can be at most {config.MAX_IMAGE_BYTES // (1024 * 1024)} MB")
        extension = _image_extension(image)
        if extension is None:
            raise Invalid("Images must be JPEG, PNG, or WebP")
        file_name = await asyncio.to_thread(_save_image, image, extension)
        image_url = f"{config.UPLOAD_URL_PREFIX}/{file_name}"

    try:
        row = await posts.create_post(pool, plant_id, user_id, body, image_url)
    except Exception:
        # Don't leave an image behind that no post points to.
        if file_name:
            (config.UPLOAD_DIR / file_name).unlink(missing_ok=True)
        raise
    return {"post_id": row["id"], "image_url": row["image_url"]}


async def friend_posts(pool: asyncpg.Pool, user_id: UUID, limit: int) -> list[dict]:
    """
    friend_posts returns the newest posts by the user's friends.
    """
    return [dict(r) for r in await posts.list_friend_posts(pool, user_id, limit)]
