"""
Data-access layer: every SQL statement the server runs lives in this package, one module per table group.
Functions take the connection pool and return asyncpg records (or None / an empty list when nothing matches).
They hold no business rules; the service layer (app/services) decides what to read and write.
"""
import os

import asyncpg


async def create_pool() -> asyncpg.Pool:
    """
    create_pool opens a pool of database connections that the rest of the server shares.
    Connection settings come from environment variables; the host and port fall back
    to the Docker Compose defaults ("db" on port 5432) if they are not set.
    """
    return await asyncpg.create_pool(
        host=os.getenv("POSTGRES_HOST", "db"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        database=os.environ["POSTGRES_DB"],
        min_size=1,
        max_size=5,
    )
