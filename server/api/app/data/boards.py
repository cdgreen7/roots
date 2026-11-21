"""
boards table: every board that has connected to the broker, linked to a plant or not.
"""
import asyncpg


async def record_seen(pool: asyncpg.Pool, device_id: str, has_actuators: bool | None = None) -> None:
    """
    record_seen adds the board if it's new, or updates when it was last heard from.
    has_actuators is only changed when given (it comes from the board's readings).
    """
    await pool.execute(
        """
        INSERT INTO boards (device_id, has_actuators) VALUES ($1, coalesce($2, false))
        ON CONFLICT (device_id) DO UPDATE SET
            last_seen_at  = now(),
            has_actuators = coalesce($2, boards.has_actuators)
        """,
        device_id, has_actuators,
    )


async def exists(pool: asyncpg.Pool, device_id: str) -> bool:
    """
    exists returns True if the board has ever connected to the broker.
    """
    return await pool.fetchval("SELECT EXISTS (SELECT 1 FROM boards WHERE device_id = $1)", device_id)
