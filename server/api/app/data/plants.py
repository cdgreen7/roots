"""
plants table: ownership, the linked board (device_id), and whether that board is online.
Device writes are keyed by device_id, so messages from boards that are not linked to a plant change nothing.
"""
from uuid import UUID

import asyncpg

PLANT_COLUMNS = "id, owner_id, name, device_id, online, last_seen_at, created_at"


async def create_plant(pool: asyncpg.Pool, owner_id: UUID, name: str, device_id: str) -> asyncpg.Record:
    """
    create_plant adds a plant for owner_id linked to the board device_id, and returns it.
    Raises asyncpg.UniqueViolationError if another plant already has this device_id.
    """
    return await pool.fetchrow(
        f"INSERT INTO plants (owner_id, name, device_id) VALUES ($1, $2, $3) RETURNING {PLANT_COLUMNS}",
        owner_id, name, device_id,
    )


async def get_plant(pool: asyncpg.Pool, plant_id: UUID) -> asyncpg.Record | None:
    """
    get_plant returns the plant's owner, name, linked device, and online status, or None if it doesn't exist.
    """
    return await pool.fetchrow(f"SELECT {PLANT_COLUMNS} FROM plants WHERE id = $1", plant_id)


async def list_plants(pool: asyncpg.Pool, owner_id: UUID) -> list[asyncpg.Record]:
    """
    list_plants returns every plant owned by owner_id, oldest first.
    """
    return await pool.fetch(
        f"SELECT {PLANT_COLUMNS} FROM plants WHERE owner_id = $1 ORDER BY created_at", owner_id
    )


async def set_online(pool: asyncpg.Pool, device_id: str, online: bool, seen_now: bool) -> bool:
    """
    set_online records whether the board is online or offline, from its status message.
    last_seen_at is only updated when seen_now is True.
    Returns False if no plant has this device_id.
    """
    # seen_now is False for a retained status replayed on (re)connect: it may be hours old.
    row = await pool.fetchrow(
        """
        UPDATE plants SET online = $2, last_seen_at = CASE WHEN $3 THEN now() ELSE last_seen_at END
        WHERE device_id = $1
        RETURNING id
        """,
        device_id, online, seen_now,
    )
    return row is not None


async def mark_seen(pool: asyncpg.Pool, device_id: str) -> None:
    """
    mark_seen sets last_seen_at to now for the plant linked to device_id.
    Called whenever the board sends a message, so the app can show when it was last heard from.
    """
    await pool.execute("UPDATE plants SET last_seen_at = now() WHERE device_id = $1", device_id)
