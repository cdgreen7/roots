"""
posts table: plant updates users share with their friends.
"""
from uuid import UUID

import asyncpg


async def create_post(pool: asyncpg.Pool, plant_id: UUID, user_id: UUID, body: str,
                      image_url: str | None) -> asyncpg.Record:
    """
    create_post stores a post and returns its id and image_url.
    """
    return await pool.fetchrow(
        """
        INSERT INTO posts (plant_id, user_id, body, image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, image_url
        """,
        plant_id, user_id, body, image_url,
    )


async def list_friend_posts(pool: asyncpg.Pool, user_id: UUID, limit: int) -> list[asyncpg.Record]:
    """
    list_friend_posts returns posts by user_id's accepted friends (in either direction of the friendship),
    newest first, with the author's username and the plant's name.
    """
    return await pool.fetch(
        """
        SELECT p.id AS post_id, u.username, pl.name AS plant_name, p.body, p.image_url, p.created_at
        FROM posts p
        JOIN users u ON u.id = p.user_id
        JOIN plants pl ON pl.id = p.plant_id
        WHERE p.user_id IN (
            SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'accepted'
            UNION
            SELECT user_id FROM friendships WHERE friend_id = $1 AND status = 'accepted'
        )
        ORDER BY p.created_at DESC
        LIMIT $2
        """,
        user_id, limit,
    )
