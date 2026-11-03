"""
Device messages: stores what the boards publish over MQTT. The MQTT bridge passes each message here.
  roots/<deviceId>/sensordata  -> readings (insert)
  roots/<deviceId>/actuators   -> actuator_state (upsert, retained)
  roots/<deviceId>/rules       -> plant_rules (upsert, retained)
  roots/<deviceId>/status      -> plants.online / last_seen_at ("online" / "offline", retained)

"Retained" means the broker keeps the last message on that topic and replays it
to anyone who subscribes later, so it can be old.
Any live (not retained) message from a board also updates plants.last_seen_at.
Messages from devices not linked to a plant are logged and dropped.
"""
import json
import logging

import asyncpg

from ..data import device_state, plants, readings

log = logging.getLogger("roots.devices")

# The board-to-server topics the bridge subscribes to.
TOPICS = ("sensordata", "actuators", "rules", "status")


async def handle_message(pool: asyncpg.Pool, device_id: str, kind: str, raw: str, retained: bool) -> None:
    """
    handle_message checks the payload of one message from device_id on roots/<deviceId>/<kind>
    and writes it to the matching table.
    """
    # A retained reading is an old one being replayed on (re)connect; it was stored when it was live.
    if kind == "sensordata" and retained:
        return
    if not raw:
        return  # an empty payload means a retained message is being cleared

    if kind == "status":
        if raw not in ("online", "offline"):
            log.warning("unexpected status %r from %s", raw[:50], device_id)
            return
        log.info("%s is %s", device_id, raw)
        online = raw == "online"
        # "offline" comes from the broker, not the board: the board registers it as its "Last Will" message
        # when it connects, and the broker publishes it if the board drops off. So it isn't a sighting.
        if not await plants.set_online(pool, device_id, online, seen_now=online and not retained):
            log.warning("status from unregistered device %s dropped (no plant has this device_id)", device_id)
        return

    # Every other topic carries a JSON object.
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = None
    if not isinstance(data, dict):
        log.warning("bad JSON on %s from %s: %r", kind, device_id, raw[:200])
        return

    # Map the board's field names to the database column names.
    if kind == "sensordata":
        stored = await readings.insert_reading(pool, device_id, {
            "temp": _number(data.get("temp_c")),
            "humidity": _number(data.get("humidity")),
            "soil_moisture": _number(data.get("soil_pct")),
            "light": _number(data.get("light_lux")),
        })
    elif kind == "actuators":
        stored = await device_state.upsert_actuator_state(pool, device_id, {
            "water_pump": _is_on(data, "water_pump"),
            "grow_light": _is_on(data, "grow_light"),
            "fan": _is_on(data, "fan"),
            "pump_fault": bool(data.get("pump_fault", False)),
        })
    elif kind == "rules":
        stored = await device_state.upsert_rules(pool, device_id, data)
    else:
        return

    # Only live messages count as a sighting; retained ones may be hours old.
    if not stored:
        log.warning("%s from unregistered device %s dropped (no plant has this device_id)", kind, device_id)
    elif not retained:
        await plants.mark_seen(pool, device_id)


def _number(value) -> float | None:
    """
    _number returns a sensor value as a float, or None if it is null, missing, or not a number
    (stored as NULL). Booleans are rejected because Python treats True and False as numbers.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _is_on(state: dict, name: str) -> bool:
    """
    _is_on returns whether the named actuator is on in the board's state message,
    which looks like {"water_pump": {"on": true, "mode": "auto"}, ...}. Missing or malformed entries count as off.
    """
    entry = state.get(name)
    return bool(entry.get("on")) if isinstance(entry, dict) else False
