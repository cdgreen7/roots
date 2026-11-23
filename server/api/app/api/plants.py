"""
/link (FR11), /plants, /plant_readings (FR1-FR4), and /alerts (FR12).
"""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field

from ..services import alerts, plants
from .deps import CurrentUser, Pool

router = APIRouter(tags=["plants"])


class Link(BaseModel):
    """
    Link is the body of POST /link.
    """
    # Letters, digits, "-" and "_" only, because it goes into MQTT topic names (no "/", "+" or "#").
    device_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    plant_name: str = Field(min_length=1, max_length=100)


@router.post("/link", status_code=status.HTTP_201_CREATED)
async def link(pool: Pool, user_id: CurrentUser, body: Link):
    """
    link adds a new board (the device id it prints at boot) to the account as a plant.
    Returns {plant_id, linked}.
    """
    return await plants.link_device(pool, user_id, body.device_id, body.plant_name)


@router.get("/plants")
async def list_plants(pool: Pool, user_id: CurrentUser):
    """
    list_plants returns the logged-in user's plants, with each board's online status.
    """
    return await plants.list_plants(pool, user_id)


@router.get("/plant_readings")
async def plant_readings(
    pool: Pool,
    user_id: CurrentUser,
    plant_id: UUID,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(100, ge=1, le=5000),
):
    """
    plant_readings returns the plant's sensor metrics: {current, history, ranges}. since/until are ISO 8601 timestamps,
    for example 2026-10-12T00:00:00-08:00. History is newest first.
    """
    return await plants.plant_readings(pool, user_id, plant_id, since, until, limit)


@router.get("/alerts")
async def plant_alerts(pool: Pool, user_id: CurrentUser, plant_id: UUID):
    """
    plant_alerts returns current problems with the plant or its board: [{plant_id, type, message}].
    """
    return await alerts.plant_alerts(pool, user_id, plant_id)
