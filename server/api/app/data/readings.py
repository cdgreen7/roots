"""
readings table: one row per sensor message from a board.
"""
from datetime import datetime
from uuid import UUID

import asyncpg

# The measured columns, in the order the app should show them.
METRICS = ("temp", "humidity", "soil_moisture", "light")

# Longest a single reading counts toward sunlight_hours. Boards send every 10 s, so a longer gap
# means the board was offline, and that time shouldn't count as light.
MAX_READING_GAP_S = 60

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

async def sunlight_hours(pool: asyncpg.Pool, plant_id: UUID, since: datetime | None,
                         until: datetime | None, lux_threshold: float) -> float:
    """
    sunlight_hours returns how many hours in the since/until window the plant had at least lux_threshold lux,
    rounded to one decimal place. Each reading counts from when it was taken until the next one
    (or the end of the window), up to MAX_READING_GAP_S.
    """
    hours = await pool.fetchval(
        """
        SELECT coalesce(sum(least(extract(epoch FROM next_at - recorded_at)::float8, $5::float8))
                        FILTER (WHERE light >= $4::float8), 0) / 3600
        FROM (
            SELECT light, recorded_at,
                   lead(recorded_at, 1, coalesce($3::timestamptz, now())) OVER (ORDER BY recorded_at) AS next_at
            FROM readings
            WHERE plant_id = $1
              AND ($2::timestamptz IS NULL OR recorded_at >= $2)
              AND ($3::timestamptz IS NULL OR recorded_at < $3)
        ) r
        """,
        plant_id, since, until, lux_threshold, MAX_READING_GAP_S,
    )
    return round(float(hours), 1)