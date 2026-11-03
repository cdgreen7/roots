"""
Plants: who may see or change them, linking a board to an account, and the sensor data summary.
"""
from datetime import datetime
from uuid import UUID

import asyncpg

from ..data import plants, readings, users
from .errors import Conflict, NotFound


async def owned_plant(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> asyncpg.Record:
    """
    owned_plant returns the plant if user_id owns it. Only the owner may control a plant or change its settings.
    Raises NotFound otherwise (not a "forbidden" error, so other people's plant ids aren't confirmed to exist).
    """
    plant = await plants.get_plant(pool, plant_id)
    if plant is None or plant["owner_id"] != user_id:
        raise NotFound("Plant not found")
    return plant


async def viewable_plant(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> asyncpg.Record:
    """
    viewable_plant returns the plant if user_id owns it or is an accepted friend of the owner,
    who may view its readings and alerts. Raises NotFound otherwise.
    """
    plant = await plants.get_plant(pool, plant_id)
    if plant is None or (plant["owner_id"] != user_id and not await users.are_friends(pool, user_id, plant["owner_id"])):
        raise NotFound("Plant not found")
    return plant


async def link_device(pool: asyncpg.Pool, user_id: UUID, device_id: str, plant_name: str) -> dict:
    """
    link_device creates a plant for the user linked to the board device_id (the "roots-xxxxxx" id
    the board prints at boot), so the server starts storing that board's data.
    Raises Conflict if the board is already linked to a plant.
    """
    try:
        plant = await plants.create_plant(pool, user_id, plant_name.strip(), device_id)
    except asyncpg.UniqueViolationError as e:
        raise Conflict("That device is already linked to a plant") from e
    return {"plant_id": plant["id"], "linked": True}


async def list_plants(pool: asyncpg.Pool, user_id: UUID) -> list[dict]:
    """
    list_plants returns the user's own plants.
    """
    return [dict(p) for p in await plants.list_plants(pool, user_id)]


def _ranges(row: asyncpg.Record) -> dict:
    """
    _ranges reshapes get_ranges' flat columns into {"temp": {"min": ..., "max": ..., "avg": ...}, ..., "count": n}.
    Averages are rounded to one decimal place, the precision the board sends.
    """
    shaped = {}
    for metric in readings.METRICS:
        average = row[f"{metric}_avg"]
        shaped[metric] = {
            "min": row[f"{metric}_min"],
            "max": row[f"{metric}_max"],
            "avg": round(average, 1) if average is not None else None,
        }
    shaped["count"] = row["count"]
    return shaped


async def plant_readings(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID, since: datetime | None,
                         until: datetime | None, limit: int) -> dict:
    """
    plant_readings returns what the app's data screen shows:
      current - the newest reading (None if the board hasn't sent one)
      history - readings in the since/until window, newest first, up to limit
      ranges  - the minimum, maximum, and average of each metric over the whole window
    """
    await viewable_plant(pool, user_id, plant_id)
    latest = await readings.get_readings(pool, plant_id, None, None, 1)
    history = await readings.get_readings(pool, plant_id, since, until, limit)
    ranges = await readings.get_ranges(pool, plant_id, since, until)
    return {
        "plant_id": plant_id,
        "current": dict(latest[0]) if latest else None,
        "history": [dict(r) for r in history],
        "ranges": _ranges(ranges),
    }
