# Roots Board

ESP32 firmware for a Roots plant board.

Reads a capacitive soil moisture sensor, a DHT11 temperature/humidity sensor, and a TSL2591 light sensor, and publishes the readings as JSON over MQTT every 10 seconds. The Roots backend (`server/`) subscribes and stores them. It also drives the water pump, grow light and fan (see [Actuators](#actuators)).

## Hardware

- ESP32 DevKit V1 (ESP-WROOM-32)
- Capacitive soil moisture sensor (TLC555I based, v2.0.0)
- DHT11 temperature/humidity sensor
- TSL2591 light sensor (I2C)

## Wiring

| Sensor | Pin | ESP32 |
|---|---|---|
| Soil moisture | AOUT | GPIO34 |
| Soil moisture | VCC / GND | 3.3V / GND |
| DHT11 | DATA | GPIO4 |
| DHT11 | VCC / GND | 3.3V / GND |
| TSL2591 | SDA | GPIO21 |
| TSL2591 | SCL | GPIO22 |
| TSL2591 | VCC / GND | 3.3V / GND |

Add a 4.7–10kΩ pull-up resistor between DHT11 DATA and VCC if your module doesn't already have one.

GPIO34 is an input-only ADC1 pin, chosen so analog reads stay reliable alongside WiFi.

## Setup

Built with [PlatformIO](https://platformio.org/). Libraries are pulled automatically from `platformio.ini`:

- DHT sensor library
- Adafruit Unified Sensor
- Adafruit TSL2591 Library
- ArduinoJson
- PubSubClient (MQTT)

Copy `include/secrets.h.example` to `include/secrets.h` (gitignored) and fill in your Wi-Fi credentials, plus MQTT credentials if the broker requires them (leave them `""` for an anonymous broker):

```cpp
#define WIFI_SSID     "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define MQTT_USER     ""
#define MQTT_PASS     ""
```

Set `MQTT_HOST` in `include/config.h` to the IP of the machine running the Mosquitto container.

```
pio run -t upload
pio device monitor
```

## Device ID

The board names itself `roots-` plus the last 3 bytes of its MAC address (e.g. `roots-a1b2c3`) and prints it over serial at boot. The backend only stores data from boards it knows, so put this ID in the plant's `plants.device_id` column.

## MQTT topics

Everything lives under `roots/<deviceId>/`.

| Topic | Direction | Retained | Payload |
|---|---|---|---|
| `sensordata` | board → server | no | Sensor readings (below) |
| `status` | board → server | yes | `online`, or `offline` (sent by the broker as the board's Last Will when it drops off) |
| `actuators` | board → server | yes | Actuator state, see [Actuators](#actuators) |
| `rules` | board → server | yes | Current rule set |
| `cmd` | server → board | no | Commands |

A `sensordata` message looks like:

```json
{
  "device_id": "roots-a1b2c3",
  "uptime_s": 123,
  "temp_c": 22.5,
  "humidity": 55.0,
  "soil_pct": 42.0,
  "soil_raw": 2100,
  "light_lux": 134.2,
  "rssi": -61
}
```

`temp_c` / `humidity` are `null` if the DHT11 read fails, and `light_lux` is `null` if the light sensor isn't found or the read fails.

Wi-Fi connects at boot. If it can't connect within 20 s, the board restarts and tries again. After that it reconnects on its own if Wi-Fi drops. The MQTT connection is retried every 5 s. Actuator rules keep running while either one is down; readings are only published while connected.

## Calibration

The soil sensor's dry/wet raw ADC values are in `include/config.h`:

```cpp
#define SOIL_RAW_DRY  3000
#define SOIL_RAW_WET  1300
```

Watch `soil_raw` with the sensor in dry air and then submerged in water, and update these two values to match your sensor.

## Actuators

Optional — set `ACTUATORS_ENABLED 0` in `config.h` for a sensor-only board.

| Actuator | GPIO | Notes |
|---|---|---|
| Water pump (5V USB) | 25 | Max 30 s per run, always timed |
| Grow light (USB) | 26 | Schedule-based (NTP time, Alaska TZ) |
| Fan | 27 | Temp/humidity with hysteresis |

Don't drive loads straight from a GPIO. Switch each 5V USB line low-side with a logic-level N-MOSFET module (or a relay module that triggers at 3.3 V). Put a flyback diode across the pump and fan, and tie the 5V supply ground to ESP32 GND. Relay boards are usually active-low, so set `*_ACTIVE_LOW true` for those.

### MQTT

Commands go to `roots/<deviceId>/cmd`:

```json
{"cmd":"read"}
{"cmd":"interval","seconds":30}
{"cmd":"actuator","target":"water_pump","state":"on","duration_s":10}
{"cmd":"actuator","target":"fan","state":"off"}
{"cmd":"actuator","target":"grow_light","state":"auto"}
{"cmd":"rules","water_pump_auto":true,"soil_min":30,"soil_target":45,"fan_auto":true,"temp_max":28,"humidity_max":75,"grow_light_auto":true,"light_on_hour":7,"light_on_hours":14}
{"cmd":"pump_reset"}
{"cmd":"actuators"}
```

`read` publishes a reading right away. `interval` changes how often readings are published (5-3600 s; resets to 10 s on reboot).

`state` can be `on`, `off`, `toggle` or `auto`. `on`/`off` puts that actuator in manual mode until `auto` is sent. If you include `duration_s`, it returns to auto when the time runs out. Rules are partial updates, saved to flash, and evaluated on the board, so control keeps working when the server or Wi-Fi is down. The board is the source of truth for rules; the backend mirrors what it publishes on `rules` into `plant_rules`.

The board publishes (retained):
- `roots/<id>/actuators`: `{"water_pump":{"on":false,"mode":"auto"},"grow_light":{...},"fan":{...},"pump_fault":false,"time_synced":true}`
- `roots/<id>/rules`: the current rule set

Auto watering runs in pulses (`pulse_s`), then waits `soak_s` for the water to soak in before checking the soil again. If `max_pulses` don't get the soil to `soil_target`, it sets `pump_fault` and turns off auto watering until `pump_reset` (that usually means an empty reservoir or the sensor is out of the soil). It also won't water on soil readings that point to a disconnected sensor.
