# Roots Board

Basic sensor read for a soil/environment monitoring setup on an ESP32.

Reads a capacitive soil moisture sensor, a DHT11 temperature/humidity sensor, and a TSL2591 light sensor, and prints the values to the serial monitor every 2 seconds.

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

```
pio run -t upload
pio device monitor
```

## Calibration

The soil sensor's dry/wet raw ADC values are placeholders in `src/main.cpp`:

```cpp
const int SOIL_DRY = 3000;
const int SOIL_WET = 1200;
```

Watch the raw value printed over serial with the sensor in dry air and then submerged in water, and update these two constants to match your sensor.
