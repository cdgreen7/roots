"""
actuator_state and plant_rules tables: what the board last reported about its outputs and its rule set.
Each plant has at most one row in each, created the first time and updated in place after that ("upsert").
"""
from uuid import UUID

import asyncpg

# The board's rule set (see firmware actuators.cpp). The board is the source of truth;
# plant_rules mirrors whatever it last published on roots/<deviceId>/rules.
RULE_COLUMNS = (
    "water_pump_auto", "grow_light_auto", "fan_auto",
    "soil_min", "soil_target", "pulse_s", "soak_s", "max_pulses",
    "temp_max", "humidity_max", "light_on_hour", "light_on_hours",
)


async def upsert_actuator_state(pool: asyncpg.Pool, device_id: str, state: dict) -> bool:
    """
    upsert_actuator_state saves whether the pump, grow light, and fan are on, plus the pump fault flag.
    Returns False if no plant has this device_id.
    """
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
        device_id, state["water_pump"], state["grow_light"], state["fan"], state["pump_fault"],
    )
    return row is not None


async def upsert_rules(pool: asyncpg.Pool, device_id: str, rules: dict) -> bool:
    """
    upsert_rules saves the rule set the board last published. The SQL is built from RULE_COLUMNS
    so adding a rule only means adding its column name there. Rules missing from the message are stored as NULL.
    Returns False if no plant has this device_id.
    """
    columns = ", ".join(RULE_COLUMNS)
    # Placeholders start at $2 because $1 is the device_id.
    params = ", ".join(f"${i + 2}" for i in range(len(RULE_COLUMNS)))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in RULE_COLUMNS)
    row = await pool.fetchrow(
        f"""
        INSERT INTO plant_rules (plant_id, {columns}, updated_at)
        SELECT id, {params}, now() FROM plants WHERE device_id = $1
        ON CONFLICT (plant_id) DO UPDATE SET {updates}, updated_at = EXCLUDED.updated_at
        RETURNING plant_id
        """,
        device_id, *(rules.get(c) for c in RULE_COLUMNS),
    )
    return row is not None


async def get_actuator_state(pool: asyncpg.Pool, plant_id: UUID) -> asyncpg.Record | None:
    """
    get_actuator_state returns the last state the board reported for the pump, grow light,
    and fan, or None if the board hasn't reported one yet.
    """
    return await pool.fetchrow(
        "SELECT water_pump, grow_light, fan, pump_fault, uploaded_at FROM actuator_state WHERE plant_id = $1",
        plant_id,
    )


async def get_rules(pool: asyncpg.Pool, plant_id: UUID) -> asyncpg.Record | None:
    """
    get_rules returns the rule set the board last reported, or None if it hasn't reported one yet.
    """
    return await pool.fetchrow(
        f"SELECT {', '.join(RULE_COLUMNS)}, updated_at FROM plant_rules WHERE plant_id = $1", plant_id
    )
