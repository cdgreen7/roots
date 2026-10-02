# Roots Sensor Test

Standalone firmware that reads every sensor on the Roots board and prints the values to the serial monitor.

Use it to check your wiring, calibrate the soil sensor, and see what each sensor reports, since the current firmware will not show these results currently (still need to set up MQTT broker!)

## Run it

Open this folder (`firmware-testing/`) as its own project in PlatformIO, then:


```
pio run -t upload
pio device monitor
```
OR in the bottom left corner of VS Code, click the checkmark, arrow, then plug. 

## Wiring

Same as the main firmware:

| Sensor | Pin | ESP32 |
|---|---|---|
| Soil moisture | AOUT | GPIO34 |
| DHT11 | DATA | GPIO4 |
| TSL2591 | SDA / SCL | GPIO21 / GPIO22 |

All sensors run on 3.3V / GND. 

NOTE: Don't get too familiar with DHT11, this sensor will likely be swapped for an AHT20 which uses I2C (Similar to the TSL2591)

## Soil calibration

Note the `raw` soil value with the probe in dry air and then in water, and put those values in `SOIL_RAW_DRY` / `SOIL_RAW_WET` in `src/main.cpp` (and in `firmware/include/config.h` for the main firmware).
