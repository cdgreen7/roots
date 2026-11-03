"""
readings table: one row per sensor message from a board.
"""
from datetime import datetime
from uuid import UUID

import asyncpg

# The measured columns, in the order the app shows them.
METRICS = ("temp", "humidity", "soil_moisture", "light")


async def insert_reading(pool: asyncpg.Pool, device_id: str, reading: dict) -> bool:
    """
    insert_reading stores one set of sensor readings (temperature, humidity, soil moisture, light)
    for the plant linked to device_id. Returns False if no plant has this device_id.
    """
    row = await pool.fetchrow(
        """
        INSERT INTO readings (plant_id, temp, humidity, soil_moisture, light)
        SELECT id, $2, $3, $4, $5 FROM plants WHERE device_id = $1
        RETURNING id
        """,
        device_id, reading["temp"], reading["humidity"], reading["soil_moisture"], reading["light"],
    )
    return row is not None


async def get_readings(pool: asyncpg.Pool, plant_id: UUID, since: datetime | None,
                       until: datetime | None, limit: int) -> list[asyncpg.Record]:
    """
    get_readings returns the plant's sensor readings, newest first, up to limit rows.
    since and until are optional; when given, only readings from since (inclusive)
    up to until (exclusive) are returned.
    """
    return await pool.fetch(
        """
        SELECT temp, humidity, soil_moisture, light, recorded_at
        FROM readings
        WHERE plant_id = $1
          AND ($2::timestamptz IS NULL OR recorded_at >= $2)
          AND ($3::timestamptz IS NULL OR recorded_at < $3)
        ORDER BY recorded_at DESC
        LIMIT $4
        """,
        plant_id, since, until, limit,
    )


async def get_ranges(pool: asyncpg.Pool, plant_id: UUID, since: datetime | None,
                     until: datetime | None) -> asyncpg.Record:
    """
    get_ranges returns the minimum, maximum, and average of each metric over the same window as get_readings
    (but over every reading in it, not just the first limit rows), as columns like temp_min / temp_max / temp_avg,
    plus count, the number of readings in the window.
    """
    aggregates = ", ".join(
        f"min({m}) AS {m}_min, max({m}) AS {m}_max, avg({m}) AS {m}_avg" for m in METRICS
    )
    return await pool.fetchrow(
        f"""
        SELECT {aggregates}, count(*) AS count
        FROM readings
        WHERE plant_id = $1
          AND ($2::timestamptz IS NULL OR recorded_at >= $2)
          AND ($3::timestamptz IS NULL OR recorded_at < $3)
        """,
        plant_id, since, until,
    )
