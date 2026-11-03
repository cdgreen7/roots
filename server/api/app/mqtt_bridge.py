"""
MQTT connection to the Mosquitto broker.

Subscribes to what the boards publish (roots/<deviceId>/sensordata, actuators, rules, status) and passes
each message to the service layer (services/devices.py), which stores it. Also publishes commands to
roots/<deviceId>/cmd for the service layer (services/control.py).
Reconnects to the broker forever if the connection drops.
"""
import asyncio
import json
import logging
import os
import uuid

import aiomqtt
import asyncpg

from .services import devices

log = logging.getLogger("roots.mqtt")

TOPIC_ROOT = os.getenv("MQTT_TOPIC_ROOT", "roots")
RECONNECT_S = 5  # seconds to wait before reconnecting to the broker


class MqttBridge:
    """
    MqttBridge holds the database pool and the current broker connection.
    main.py starts run() as a background task when the server starts, and the service layer
    calls publish_command() to send commands to a board.
    """

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.client: aiomqtt.Client | None = None

    async def run(self) -> None:
        """
        run connects to the broker, subscribes to every board's topics, and passes each incoming
        message to _handle(). If the connection drops it waits RECONNECT_S seconds and tries again, forever.
        self.client is only set while connected, so publish_command() can tell if the broker is down.
        """
        while True:
            try:
                async with aiomqtt.Client(
                    hostname=os.getenv("MQTT_HOST", "mqtt"),
                    port=int(os.getenv("MQTT_PORT", "1883")),
                    username=os.getenv("MQTT_USER") or None,
                    password=os.getenv("MQTT_PASS") or None,
                    # Unique per process: a shared ID makes two instances (for example a development server and
                    # the container) kick each other off the broker in a loop.
                    identifier=f"roots-api-{uuid.uuid4().hex[:8]}",
                ) as client:
                    self.client = client
                    # "+" matches any device ID, so this subscribes to every board.
                    for topic in devices.TOPICS:
                        await client.subscribe(f"{TOPIC_ROOT}/+/{topic}", qos=1)
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

    async def publish_command(self, device_id: str, command: dict) -> None:
        """
        publish_command sends a JSON command to roots/<deviceId>/cmd (see the command list in firmware actuators.cpp).
        Raises ConnectionError if the broker isn't connected or the publish fails, so the API can return an error.
        """
        if self.client is None:
            raise ConnectionError("MQTT broker not connected")
        try:
            await self.client.publish(f"{TOPIC_ROOT}/{device_id}/cmd", json.dumps(command), qos=1)
        except aiomqtt.MqttError as e:
            raise ConnectionError(f"MQTT publish failed: {e}") from e

    async def _handle(self, message: aiomqtt.Message) -> None:
        """
        _handle works out which board and topic a message came from and hands it to the service layer.
        """
        # Topics look like roots/<deviceId>/<kind>; ignore anything else.
        parts = message.topic.value.split("/")
        if len(parts) != 3:
            return
        _, device_id, kind = parts
        raw = message.payload.decode(errors="replace") if isinstance(message.payload, bytes) else str(message.payload)
        await devices.handle_message(self.pool, device_id, kind, raw, bool(message.retain))
