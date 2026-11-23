"""
Alerts: problems with a plant or its board that the app should show the user.
They are worked out on request from the latest data, so nothing has to be stored or cleared.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg

from ..data import device_state, readings
from .plants import viewable_plant

# The board sends a reading every 10 seconds; this long without one means something is wrong.
STALE_AFTER = timedelta(minutes=5)


def _alert(plant_id: UUID, kind: str, message: str) -> dict:
    """
    _alert builds one alert in the {plant_id, type, message} shape the app expects.
    """
    return {"plant_id": plant_id, "type": kind, "message": message}


async def plant_alerts(pool: asyncpg.Pool, user_id: UUID, plant_id: UUID) -> list[dict]:
    """
    plant_alerts returns the plant's current alerts, each {plant_id, type, message}. Types:
      offline, no_data, stale_data              - the board isn't reporting
      climate_sensor_error, light_sensor_error  - a sensor is missing or failing
      pump_fault                                - auto watering stopped because the soil didn't respond
      low_soil, high_temperature, high_humidity - the latest reading is outside the plant's rules
    """
    plant = await viewable_plant(pool, user_id, plant_id)
    alerts = []

    # Is the board connected to the broker?
    if not plant["online"]:
        alerts.append(_alert(plant_id, "offline", "The plant's board is offline."))

    # Is the board sending readings, and are its sensors working? A NULL value means that sensor failed to read.
    latest_rows = await readings.get_readings(pool, plant_id, None, None, 1)
    latest = latest_rows[0] if latest_rows else None
    if latest is None:
        alerts.append(_alert(plant_id, "no_data", "The board hasn't sent any readings yet."))
    else:
        if plant["online"] and datetime.now(timezone.utc) - latest["recorded_at"] > STALE_AFTER:
            alerts.append(_alert(plant_id, "stale_data", "The board is online but hasn't sent a reading recently."))
        if latest["temp"] is None or latest["humidity"] is None:
            alerts.append(_alert(plant_id, "climate_sensor_error",
                                 "The temperature and humidity sensor isn't reporting. Check its wiring."))
        if latest["light"] is None:
            alerts.append(_alert(plant_id, "light_sensor_error", "The light sensor isn't reporting. Check its wiring."))

    # Did the board give up on auto watering?
    state = await device_state.get_actuator_state(pool, plant_id)
    if state is not None and state["pump_fault"]:
        alerts.append(_alert(plant_id, "pump_fault",
                             "Auto watering stopped because the soil stayed dry. Check the reservoir and tubing, "
                             "then reset the pump."))

    # Is the newest reading outside the plant's rules?
    rules = await device_state.get_rules(pool, plant_id)
    if rules is not None and latest is not None:
        # above is only True when both values exist, so a missing reading or an unset rule never alerts.
        def above(value, limit):
            return value is not None and limit is not None and value > limit

        if above(rules["soil_min"], latest["soil_moisture"]):
            alerts.append(_alert(plant_id, "low_soil",
                                 f"Soil moisture is {latest['soil_moisture']}%, below {rules['soil_min']}%."))
        if above(latest["temp"], rules["temp_max"]):
            alerts.append(_alert(plant_id, "high_temperature",
                                 f"Temperature is {latest['temp']} °C, above {rules['temp_max']} °C."))
        if above(latest["humidity"], rules["humidity_max"]):
            alerts.append(_alert(plant_id, "high_humidity",
                                 f"Humidity is {latest['humidity']}%, above {rules['humidity_max']}%."))
    return alerts
