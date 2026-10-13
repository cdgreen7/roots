"""
Postgres access. Device writes are keyed by device_id and resolved to a plant in
the same statement, so messages from devices not linked to a plant change nothing.
"""
import os
from datetime import datetime

import asyncpg

# The board's rule set (see firmware actuators.cpp). The board is the source of truth;
# plant_rules mirrors whatever it last published on roots/<id>/rules.
RULE_COLUMNS = (
    "water_pump_auto", "grow_light_auto", "fan_auto",
    "soil_min", "soil_target", "pulse_s", "soak_s", "max_pulses",
    "temp_max", "humidity_max", "light_on_hour", "light_on_hours",
)


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        host=os.getenv("POSTGRES_HOST", "db"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        database=os.environ["POSTGRES_DB"],
        min_size=1,
        max_size=5,
    )


# Writes from the MQTT bridge

async def insert_reading(pool: asyncpg.Pool, device_id: str, r: dict) -> bool:
    row = await pool.fetchrow(
        """
        INSERT INTO readings (plant_id, temp, humidity, soil_moisture, light)
        SELECT id, $2, $3, $4, $5 FROM plants WHERE device_id = $1
        RETURNING id
        """,
        device_id, r["temp"], r["humidity"], r["soil_moisture"], r["light"],
    )
    return row is not None


async def upsert_actuator_state(pool: asyncpg.Pool, device_id: str, s: dict) -> bool:
    row = await pool.fetchrow(
        """
        INSERT INTO actuator_state (plant_id, water_pump, grow_light, fan, pump_fault, uploaded_at)
        SELECT id, $2, $3, $4, $5, now() FROM plants WHERE device_id = $1
        ON CONFLICT (plant_id) DO UPDATE SET
            water_pump  = EXCLUDED.water_pump,
            grow_light  = EXCLUDED.grow_light,
            fan         = EXCLUDED.fan,
            pump_fault  = EXCLUDED.pump_fault,
            uploaded_at = EXCLUDED.uploaded_at
        RETURNING plant_id
        """,
        device_id, s["water_pump"], s["grow_light"], s["fan"], s["pump_fault"],
    )
    return row is not None


async def upsert_rules(pool: asyncpg.Pool, device_id: str, rules: dict) -> bool:
    cols = ", ".join(RULE_COLUMNS)
    params = ", ".join(f"${i + 2}" for i in range(len(RULE_COLUMNS)))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in RULE_COLUMNS)
    row = await pool.fetchrow(
        f"""
        INSERT INTO plant_rules (plant_id, {cols}, updated_at)
        SELECT id, {params}, now() FROM plants WHERE device_id = $1
        ON CONFLICT (plant_id) DO UPDATE SET {updates}, updated_at = EXCLUDED.updated_at
        RETURNING plant_id
        """,
        device_id, *(rules.get(c) for c in RULE_COLUMNS),
    )
    return row is not None


async def set_online(pool: asyncpg.Pool, device_id: str, online: bool, seen_now: bool) -> bool:
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
    await pool.execute("UPDATE plants SET last_seen_at = now() WHERE device_id = $1", device_id)


# Reads for the REST API

async def get_plant(pool: asyncpg.Pool, plant_id) -> asyncpg.Record | None:
    return await pool.fetchrow(
        "SELECT id, name, device_id, online, last_seen_at FROM plants WHERE id = $1", plant_id
    )


async def get_readings(pool: asyncpg.Pool, plant_id, since: datetime | None,
                       until: datetime | None, limit: int) -> list[asyncpg.Record]:
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


async def get_actuator_state(pool: asyncpg.Pool, plant_id) -> asyncpg.Record | None:
    return await pool.fetchrow(
        "SELECT water_pump, grow_light, fan, pump_fault, uploaded_at FROM actuator_state WHERE plant_id = $1",
        plant_id,
    )


async def get_rules(pool: asyncpg.Pool, plant_id) -> asyncpg.Record | None:
    return await pool.fetchrow(
        f"SELECT {', '.join(RULE_COLUMNS)}, updated_at FROM plant_rules WHERE plant_id = $1", plant_id
    )
