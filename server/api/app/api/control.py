"""
/actuators (FR5), /rules (FR6), and /pump_reset. Changes are sent to the board over MQTT;
the board reports its new state back, and GET /actuators and GET /rules return what it last reported.
"""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services import control
from .deps import Bridge, CurrentUser, Pool

router = APIRouter(tags=["control"])


class ActuatorCommand(BaseModel):
    """
    ActuatorCommand is the body of POST /actuators.
    """
    plant_id: UUID
    actuator: Literal["water_pump", "grow_light", "fan"]
    state: Literal["on", "off", "auto"]
    duration_s: int | None = Field(default=None, ge=1, le=86400)


class Rules(BaseModel):
    """
    Rules is a partial update to the board's rule set; only fields that are set get sent to the board.
    Ranges match the firmware (cmdRules in actuators.cpp).
    """
    water_pump_auto: bool | None = None
    grow_light_auto: bool | None = None
    fan_auto: bool | None = None
    soil_min: float | None = Field(default=None, ge=0, le=100)
    soil_target: float | None = Field(default=None, ge=0, le=100)
    pulse_s: int | None = Field(default=None, ge=1, le=30)
    soak_s: int | None = Field(default=None, ge=10, le=3600)
    max_pulses: int | None = Field(default=None, ge=1, le=50)
    temp_max: float | None = Field(default=None, ge=0, le=60)
    humidity_max: float | None = Field(default=None, ge=0, le=100)
    light_on_hour: int | None = Field(default=None, ge=0, le=23)
    light_on_hours: int | None = Field(default=None, ge=0, le=24)


class RulesUpdate(BaseModel):
    """
    RulesUpdate is the body of PUT /rules.
    """
    plant_id: UUID
    rules: Rules


class PumpReset(BaseModel):
    """
    PumpReset is the body of POST /pump_reset.
    """
    plant_id: UUID


@router.post("/actuators")
async def set_actuator(pool: Pool, bridge: Bridge, user_id: CurrentUser, body: ActuatorCommand):
    """
    set_actuator turns an actuator on or off (a manual override, for duration_s seconds if given),
    or "auto" to hand it back to the rules. Returns {actuator, state}.
    """
    return await control.set_actuator(pool, bridge, user_id, body.plant_id, body.actuator, body.state,
                                      body.duration_s)


@router.get("/actuators")
async def get_actuators(pool: Pool, user_id: CurrentUser, plant_id: UUID):
    """
    get_actuators returns the on/off state of each actuator and the pump fault flag, as the board last reported them.
    """
    return await control.get_actuators(pool, user_id, plant_id)


@router.put("/rules")
async def update_rules(pool: Pool, bridge: Bridge, user_id: CurrentUser, body: RulesUpdate):
    """
    update_rules changes the automation rules the board runs.
    Returns {plant_id, rules} with the full updated rule set.
    """
    return await control.update_rules(pool, bridge, user_id, body.plant_id, body.rules.model_dump(exclude_none=True))


@router.get("/rules")
async def get_rules(pool: Pool, user_id: CurrentUser, plant_id: UUID):
    """
    get_rules returns the rule set the board last reported: {plant_id, rules}.
    """
    return await control.get_rules(pool, user_id, plant_id)


@router.post("/pump_reset")
async def pump_reset(pool: Pool, bridge: Bridge, user_id: CurrentUser, body: PumpReset):
    """
    pump_reset clears a pump fault so auto watering starts again.
    """
    return await control.pump_reset(pool, bridge, user_id, body.plant_id)
