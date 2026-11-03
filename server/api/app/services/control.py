"""
Actuator control: turns app requests into commands for the board on roots/<deviceId>/cmd.
The board runs the automation rules itself (so plants are cared for when the server or Wi-Fi is down);
the server sends it rule changes and manual overrides, and stores what it reports back.
"""
from typing import Protocol
from uuid import UUID

import asyncpg

from ..data import device_state
from .errors import Conflict, Invalid, NotFound, Unavailable
from .plants import owned_plant


class CommandPublisher(Protocol):
    """
    CommandPublisher is anything that can send a command to a board; MqttBridge in production.
    Typing against this instead of MqttBridge keeps the service layer from depending on the MQTT code.
    """

    async def publish_command(self, device_id: str, command: dict) -> None: ...


async def _send(pool: asyncpg.Pool, publisher: CommandPublisher, user_id: UUID, plant_id: UUID,
                command: dict) -> None:
    """
    _send checks the user owns the plant and its board can receive commands, then publishes the command.
    """
    plant = await owned_plant(pool, user_id, plant_id)
    if plant["device_id"] is None:
        raise Conflict("Plant has no device linked")
    # Commands aren't queued for offline boards (no persistent session), so refuse rather than drop them.
    if not plant["online"]:
        raise Conflict("Device is offline")
    try:
        await publisher.publish_command(plant["device_id"], command)
    except ConnectionError as e:
        raise Unavailable(str(e)) from e


async def set_actuator(pool: asyncpg.Pool, publisher: CommandPublisher, user_id: UUID, plant_id: UUID,
                       actuator: str, state: str, duration_s: int | None) -> dict:
    """
    set_actuator turns an actuator on or off as a manual override (for duration_s seconds if given),
    or hands it back to the automation rules with state "auto".
    The board always times the pump (5 s by default, at most 30 s) for safety.
    """
    command = {"cmd": "actuator", "target": actuator, "state": state}
    if duration_s is not None:
        command["duration_s"] = duration_s
    await _send(pool, publisher, user_id, plant_id, command)
    return {"actuator": actuator, "state": state}


async def pump_reset(pool: asyncpg.Pool, publisher: CommandPublisher, user_id: UUID, plant_id: UUID) -> dict:
    """
    pump_reset clears the board's pump fault so auto watering starts again.
    """
    await _send(pool, publisher, user_id, plant_id, {"cmd": "pump_reset"})
    return {"plant_id": plant_id, "pump_reset": True}


async def update_rules(pool: asyncpg.Pool, publisher: CommandPublisher, user_id: UUID, plant_id: UUID,
                       changes: dict) -> dict:
    """
    update_rules sends the changed rules to the board and returns the full rule set it will run.
    The board saves them and republishes its rules, and the MQTT bridge then stores them in plant_rules.
    Raises Invalid if the result would have soil_target at or below soil_min (the pump would never stop cleanly).
    """
    if not changes:
        raise Invalid("No rule fields given")
    stored = await device_state.get_rules(pool, plant_id)
    rules = {c: stored[c] for c in device_state.RULE_COLUMNS} if stored else {}
    rules.update(changes)
    if rules.get("soil_min") is not None and rules.get("soil_target") is not None \
            and rules["soil_target"] <= rules["soil_min"]:
        raise Invalid("soil_target must be above soil_min")
    await _send(pool, publisher, user_id, plant_id, {"cmd": "rules", **changes})
    return {"plant_id": plant_id, "rules": rules}


async def get_actuators(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> dict:
    """
    get_actuators returns the last actuator state the board reported.
    """
    await owned_plant(pool, user_id, plant_id)
    row = await device_state.get_actuator_state(pool, plant_id)
    if row is None:
        raise NotFound("Device hasn't reported actuator state yet")
    return dict(row)


async def get_rules(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> dict:
    """
    get_rules returns the rule set the board last reported.
    """
    await owned_plant(pool, user_id, plant_id)
    row = await device_state.get_rules(pool, plant_id)
    if row is None:
        raise NotFound("Device hasn't reported its rules yet")
    return {"plant_id": plant_id, "rules": dict(row)}
