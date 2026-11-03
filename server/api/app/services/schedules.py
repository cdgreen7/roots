"""
Watering schedules: the days and time a user plans to water each plant (shown on the app's calendar).
"""
from datetime import time
from uuid import UUID

import asyncpg

from ..data import schedules
from .plants import owned_plant, viewable_plant


async def create_schedule(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID, days_of_week: list[int],
                          time_of_day: time) -> dict:
    """
    create_schedule saves a watering schedule for the user's plant. days_of_week uses 0 = Sunday to 6 = Saturday;
    duplicates are dropped and the days are stored in order.
    """
    await owned_plant(pool, user_id, plant_id)
    row = await schedules.create_schedule(pool, plant_id, sorted(set(days_of_week)), time_of_day)
    return {"schedule_id": row["id"]}


async def list_schedules(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> list[dict]:
    """
    list_schedules returns the plant's watering schedules.
    """
    await viewable_plant(pool, user_id, plant_id)
    return [
        {"schedule_id": r["id"], "plant_id": r["plant_id"], "days_of_week": r["days_of_week"],
         "time_of_day": r["time_of_day"]}
        for r in await schedules.list_schedules(pool, plant_id)
    ]
