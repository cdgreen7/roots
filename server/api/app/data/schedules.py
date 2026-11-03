"""
watering_schedules table: the days and time a user plans to water a plant.
"""
from datetime import time
from uuid import UUID

import asyncpg


async def create_schedule(pool: asyncpg.Pool, plant_id: UUID, days_of_week: list[int],
                          time_of_day: time) -> asyncpg.Record:
    """
    create_schedule adds a watering schedule for the plant and returns it.
    """
    return await pool.fetchrow(
        """
        INSERT INTO watering_schedules (plant_id, days_of_week, time_of_day)
        VALUES ($1, $2, $3)
        RETURNING id, plant_id, days_of_week, time_of_day
        """,
        plant_id, days_of_week, time_of_day,
    )


async def list_schedules(pool: asyncpg.Pool, plant_id: UUID) -> list[asyncpg.Record]:
    """
    list_schedules returns the plant's watering schedules, earliest time of day first.
    """
    return await pool.fetch(
        """
        SELECT id, plant_id, days_of_week, time_of_day FROM watering_schedules
        WHERE plant_id = $1 ORDER BY time_of_day
        """,
        plant_id,
    )
