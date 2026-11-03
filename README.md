# Roots — A Plant Monitoring System

**A401 Software Engineering · Team Software Bhaddies**

A smart greenhouse system and companion controller app that lets users monitor plant conditions automatically, control their plants' environment remotely, and share their plants with friends.

## Problem

Busy schedules make it hard to keep plants healthy. Roots gives plant owners a convenient, consistent way to monitor and maintain their plants — and a social space to check in on friends' plants and share updates.

## Vision

Build an accessible smart greenhouse system plus a controller app that automates plant monitoring to reduce manual work, alongside a social space where users can share what they're growing and see how others' plants are doing.

## Features (Planned)

### Core
- **Controller app** — view live status of a real plant (temperature, light, humidity, soil moisture) and control its environment.
- **ESP32 firmware + hardware** — microprocessor with sensors and actuators that transmits real plant data to the controller app.
- **Automated + manual actuation** — app can trigger actuators (water pump, grow light, fan) automatically based on set rules/boundaries, or on demand from user input.
- **Watering schedules** — users set per-plant watering schedules to track which plants need watering each day.
- **Social extension** — view the health of friends' plants; upload photos and status updates for others to see.

## Hardware

- **Microprocessor:** ESP32
- **Sensors:** temperature/humidity (AHT20), soil moisture, light
- **Actuators:** water pump, grow light, fan

## Architecture

Roots is a three-tier client-server system with an MQTT publish/subscribe channel for device traffic:

- **ESP32 boards** (`firmware/`, C++ with PlatformIO) publish sensor readings and receive actuator commands over MQTT.
- **React Native app** (`Roots-Frontend/`) reads and writes data through the REST API.
- **Backend** (`server/`) is one FastAPI service in layers (API, service, and data access) over PostgreSQL,
  with Eclipse Mosquitto as the MQTT broker. Everything runs in Docker containers on AWS.

See [server/README.md](server/README.md) for the endpoints and MQTT topics.
