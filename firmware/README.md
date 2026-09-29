# Roots Board

Basic sensor read for a soil/environment monitoring setup on an ESP32.

Reads a capacitive soil moisture sensor, a DHT11 temperature/humidity sensor, and a TSL2591 light sensor every 2 seconds, prints the values to the serial monitor, and POSTs them as JSON to a backend over WiFi.

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

Copy `include/secrets.example.h` to `include/secrets.h` (gitignored) and fill in your WiFi credentials and backend endpoint:

```cpp
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define API_ENDPOINT "http://192.168.1.100:3000/readings"
#define DEVICE_ID "roots-board-01"
```

There's no backend yet — `API_ENDPOINT` is a placeholder. Point it at anything that accepts `POST` with a JSON body and the board will send readings to it; if nothing's listening, the board logs a failed POST and keeps working over serial.

```
pio run -t upload
pio device monitor
```

## Data sent over WiFi

Each cycle POSTs a JSON body like:

```json
{
  "device_id": "roots-board-01",
  "uptime_ms": 12345,
  "soil_percent": 42,
  "soil_raw": 2100,
  "temperature_c": 22.5,
  "humidity_percent": 55.0,
  "lux": 134.2
}
```

`temperature_c` / `humidity_percent` are omitted if the DHT11 read fails. `device_id` is what a future backend would use to attribute readings to a device, and in turn to a user account.

WiFi connects at boot and reconnects automatically (with a 30s backoff) if the connection drops; sending is skipped whenever WiFi is down.

## Calibration

The soil sensor's dry/wet raw ADC values are placeholders in `src/main.cpp`:

```cpp
const int SOIL_DRY = 3000;
const int SOIL_WET = 1200;
```

Watch the raw value printed over serial with the sensor in dry air and then submerged in water, and update these two constants to match your sensor.
