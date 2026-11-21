# Roots — A Plant Monitoring System

**A401 Software Engineering · Team Software Bhaddies**

A smart greenhouse system and companion controller app that lets users monitor plant conditions automatically, control their plants' environment remotely, and share their plants with friends.

## Features 

### Core
- **Controller app** — view live status of a real plant (temperature, light, humidity, soil moisture) and control its environment.
- **ESP32 firmware + hardware** — microprocessor with sensors and actuators that transmits real plant data to the controller app.
- **Automated + manual actuation** — app can trigger actuators (water pump, grow light, fan) automatically based on set rules/boundaries, or on demand from user input.
- **Watering schedules** — users set per-plant watering schedules to track which plants need watering each day.
- **Social extension** — view the health of friends' plants; upload photos and status updates for others to see.

## Hardware

- **Microprocessor:** ESP32
- **Sensors:** temperature/humidity, soil moisture, light
- **Actuators:** water pump, grow light, fan

## Setting up a Roots board

You'll need the parts in [Hardware](#hardware), a USB cable, and [VS Code](https://code.visualstudio.com/) with the
[PlatformIO extension](https://platformio.org/install/ide?install=vscode).

1. **Wire the sensors** (and actuators, if you have them) as shown in [firmware/README.md](firmware/README.md#wiring).
   For a sensor-only board, set `ACTUATORS_ENABLED 0` in `firmware/include/config.h`.
2. **Add your Wi-Fi and board login.** Copy `firmware/include/secrets.h.example` to `firmware/include/secrets.h` and fill in:
   ```cpp
   #define WIFI_SSID     "your-wifi-name"
   #define WIFI_PASSWORD "your-wifi-password"
   #define MQTT_USER     "roots-board"
   #define MQTT_PASS     "ask the team for this"
   ```
   The board needs a 2.4 GHz Wi-Fi network.
3. **Flash the board.** Open the `firmware` folder in VS Code, plug in the ESP32, and click PlatformIO's
   **Upload** (→) button, then **Serial Monitor** (🔌).
4. **Copy the device ID.** The serial monitor prints it at startup (`roots-` plus 6 characters, e.g. `roots-a1b2c3`),
   followed by `MQTT connected` once the board reaches the server.
5. **Link it in the app.** Create an account, add a plant, and enter the device ID. Readings show up within a few seconds.

If the board keeps restarting, check the Wi-Fi name and password. If it prints `MQTT failed`, check `MQTT_USER`/`MQTT_PASS`.

## More documentation

- [firmware/README.md](firmware/README.md): wiring, calibration, MQTT topics and commands
- [server/README.md](server/README.md): running and deploying the backend
- API reference: [roots-plants.duckdns.org/docs](https://roots-plants.duckdns.org/docs)
