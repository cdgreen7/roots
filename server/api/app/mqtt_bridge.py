"""
MQTT -> Postgres bridge.

Subscribes to what the boards publish and writes it to the database:
  roots/<deviceId>/sensordata  -> readings (insert)
  roots/<deviceId>/actuators   -> actuator_state (upsert, retained)
  roots/<deviceId>/rules       -> plant_rules (upsert, retained)
  roots/<deviceId>/status      -> plants.online / last_seen_at ("online" / "offline", retained)

Any live (non-retained) message from a board also bumps plants.last_seen_at.

Also publishes commands to roots/<deviceId>/cmd for the REST endpoints.
Reconnects to the broker forever if the connection drops.
"""
import asyncio
import json
import logging
import os
import uuid

import aiomqtt
import asyncpg

from . import db

log = logging.getLogger("roots.mqtt")

TOPIC_ROOT = os.getenv("MQTT_TOPIC_ROOT", "roots")
RECONNECT_S = 5


class MqttBridge:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.client: aiomqtt.Client | None = None

    async def run(self) -> None:
        while True:
            try:
                async with aiomqtt.Client(
                    hostname=os.getenv("MQTT_HOST", "mqtt"),
                    port=int(os.getenv("MQTT_PORT", "1883")),
                    username=os.getenv("MQTT_USER") or None,
                    password=os.getenv("MQTT_PASS") or None,
                    # Unique per process: a shared ID makes two instances (e.g. a dev server and
                    # the container) kick each other off the broker in a loop.
                    identifier=f"roots-api-{uuid.uuid4().hex[:8]}",
                ) as client:
                    self.client = client
                    for sub in ("sensordata", "actuators", "rules", "status"):
                        await client.subscribe(f"{TOPIC_ROOT}/+/{sub}", qos=1)
                    log.info("MQTT connected")
                    async for message in client.messages:
                        # Nothing in one message should be able to kill the subscriber loop.
                        try:
                            await self._handle(message)
                        except Exception:
                            log.exception("error handling message on %s", message.topic.value)
            except aiomqtt.MqttError as e:
                log.warning("MQTT disconnected (%s), retrying in %ss", e, RECONNECT_S)
            finally:
                self.client = None
            await asyncio.sleep(RECONNECT_S)

    async def publish_command(self, device_id: str, cmd: dict) -> None:
        if self.client is None:
            raise ConnectionError("MQTT broker not connected")
        try:
            await self.client.publish(f"{TOPIC_ROOT}/{device_id}/cmd", json.dumps(cmd), qos=1)
        except aiomqtt.MqttError as e:
            raise ConnectionError(f"MQTT publish failed: {e}") from e

    async def _handle(self, message: aiomqtt.Message) -> None:
        parts = message.topic.value.split("/")
        if len(parts) != 3:
            return
        _, device_id, kind = parts
        # A retained reading is an old one being replayed on (re)connect; it was stored when it was live.
        if kind == "sensordata" and message.retain:
            return
        raw = message.payload.decode(errors="replace") if isinstance(message.payload, bytes) else str(message.payload)
        if not raw:
            return  # empty payload = a retained message being cleared

        if kind == "status":
            if raw not in ("online", "offline"):
                log.warning("unexpected status %r from %s", raw[:50], device_id)
                return
            log.info("%s is %s", device_id, raw)
            online = raw == "online"
            # "offline" comes from the broker (Last Will), not the board, so it isn't a sighting.
            if not await db.set_online(self.pool, device_id, online, seen_now=online and not message.retain):
                log.warning("status from unregistered device %s dropped (no plant has this device_id)", device_id)
            return

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = None
        if not isinstance(data, dict):
            log.warning("bad JSON on %s: %r", message.topic.value, raw[:200])
            return

        if kind == "sensordata":
            stored = await db.insert_reading(self.pool, device_id, {
                "temp": _num(data.get("temp_c")),
                "humidity": _num(data.get("humidity")),
                "soil_moisture": _num(data.get("soil_pct")),
                "light": _num(data.get("light_lux")),
            })
        elif kind == "actuators":
            stored = await db.upsert_actuator_state(self.pool, device_id, {
                "water_pump": _is_on(data, "water_pump"),
                "grow_light": _is_on(data, "grow_light"),
                "fan": _is_on(data, "fan"),
                "pump_fault": bool(data.get("pump_fault", False)),
            })
        elif kind == "rules":
            stored = await db.upsert_rules(self.pool, device_id, data)
        else:
            return

        if not stored:
            log.warning("%s from unregistered device %s dropped (no plant has this device_id)", kind, device_id)
        elif not message.retain:
            await db.mark_seen(self.pool, device_id)


def _num(value) -> float | None:
    """Sensor value as a float, or None for null/missing/garbage (stored as NULL)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _is_on(state: dict, name: str) -> bool:
    entry = state.get(name)
    return bool(entry.get("on")) if isinstance(entry, dict) else False
