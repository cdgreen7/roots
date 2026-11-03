"""
/schedule (FR7).
"""
from datetime import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ..services import schedules
from .deps import CurrentUser, Pool

router = APIRouter(tags=["schedules"])


class Schedule(BaseModel):
    """
    Schedule is the body of POST /schedule.
    """
    plant_id: UUID
    # 0 = Sunday through 6 = Saturday, the same as JavaScript's Date.getDay().
    days_of_week: list[Annotated[int, Field(ge=0, le=6)]] = Field(min_length=1, max_length=7)
    time_of_day: time  # "HH:MM" or "HH:MM:SS"


@router.post("/schedule", status_code=status.HTTP_201_CREATED)
async def create_schedule(pool: Pool, user_id: CurrentUser, body: Schedule):
    """
    create_schedule saves a watering schedule for a plant. Returns {schedule_id}.
    """
    return await schedules.create_schedule(pool, user_id, body.plant_id, body.days_of_week, body.time_of_day)


@router.get("/schedule")
async def list_schedules(pool: Pool, user_id: CurrentUser, plant_id: UUID):
    """
    list_schedules returns the plant's watering schedules.
    """
    return await schedules.list_schedules(pool, user_id, plant_id)
