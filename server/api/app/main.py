"""
Roots API.

Runs the MQTT -> Postgres bridge in the background and exposes REST endpoints
to read plant data and send commands to a plant's board.
"""
import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field

from . import db
from .mqtt_bridge import MqttBridge

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await db.create_pool()
    bridge = MqttBridge(pool)
    task = asyncio.create_task(bridge.run())
    app.state.pool = pool
    app.state.bridge = bridge
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    await pool.close()


app = FastAPI(title="Roots API", lifespan=lifespan)


class ActuatorCommand(BaseModel):
    target: Literal["water_pump", "grow_light", "fan"]
    state: Literal["on", "off", "toggle", "auto"]
    duration_s: int | None = Field(default=None, ge=1, le=86400)


class RulesUpdate(BaseModel):
    """Partial update; only fields that are set get sent to the board. Ranges match the firmware."""
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


def _pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool


async def _plant(request: Request, plant_id: UUID) -> asyncpg.Record:
    plant = await db.get_plant(_pool(request), plant_id)
    if plant is None:
        raise HTTPException(404, "Plant not found")
    return plant


async def _send(request: Request, plant_id: UUID, cmd: dict) -> dict:
    plant = await _plant(request, plant_id)
    if plant["device_id"] is None:
        raise HTTPException(409, "Plant has no device linked")
    # Commands aren't queued for offline boards (no persistent session), so refuse rather than drop them.
    if not plant["online"]:
        raise HTTPException(409, "Device is offline")
    try:
        await request.app.state.bridge.publish_command(plant["device_id"], cmd)
    except ConnectionError as e:
        raise HTTPException(503, str(e))
    return {"sent": cmd, "device_id": plant["device_id"]}


@app.get("/health")
async def health(request: Request):
    return {"mqtt_connected": request.app.state.bridge.client is not None}


@app.get("/plants/{plant_id}")
async def get_plant(request: Request, plant_id: UUID):
    return dict(await _plant(request, plant_id))


@app.get("/plants/{plant_id}/readings")
async def get_readings(
    request: Request,
    plant_id: UUID,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(100, ge=1, le=5000),
):
    """Newest first. since/until are ISO 8601 timestamps, e.g. 2026-10-12T00:00:00-08:00."""
    await _plant(request, plant_id)
    rows = await db.get_readings(_pool(request), plant_id, since, until, limit)
    return [dict(r) for r in rows]


@app.get("/plants/{plant_id}/readings/latest")
async def get_latest_reading(request: Request, plant_id: UUID):
    await _plant(request, plant_id)
    rows = await db.get_readings(_pool(request), plant_id, None, None, 1)
    if not rows:
        raise HTTPException(404, "No readings yet")
    return dict(rows[0])


@app.get("/plants/{plant_id}/actuators")
async def get_actuators(request: Request, plant_id: UUID):
    await _plant(request, plant_id)
    row = await db.get_actuator_state(_pool(request), plant_id)
    if row is None:
        raise HTTPException(404, "Device hasn't reported actuator state yet")
    return dict(row)


@app.post("/plants/{plant_id}/actuators")
async def command_actuator(request: Request, plant_id: UUID, body: ActuatorCommand):
    return await _send(request, plant_id, {"cmd": "actuator", **body.model_dump(exclude_none=True)})


@app.get("/plants/{plant_id}/rules")
async def get_rules(request: Request, plant_id: UUID):
    await _plant(request, plant_id)
    row = await db.get_rules(_pool(request), plant_id)
    if row is None:
        raise HTTPException(404, "Device hasn't reported its rules yet")
    return dict(row)


@app.patch("/plants/{plant_id}/rules")
async def update_rules(request: Request, plant_id: UUID, body: RulesUpdate):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(422, "No rule fields given")
    # The board saves the rules and republishes them; the bridge then writes them to plant_rules.
    return await _send(request, plant_id, {"cmd": "rules", **fields})


@app.post("/plants/{plant_id}/pump-reset")
async def pump_reset(request: Request, plant_id: UUID):
    return await _send(request, plant_id, {"cmd": "pump_reset"})


@app.post("/plants/{plant_id}/read")
async def request_reading(request: Request, plant_id: UUID):
    return await _send(request, plant_id, {"cmd": "read"})
