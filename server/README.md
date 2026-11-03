# Roots Server

The backend for Roots, following the team's architecture document: a three-tier client-server system
with an MQTT publish/subscribe channel for the boards. Everything runs in Docker (on AWS in production).

| Container | Image | Job |
|---|---|---|
| `api` | `./api` (Python + FastAPI) | REST API for the app, MQTT bridge for the boards |
| `mqtt` | Eclipse Mosquitto 2 | Brokers all device messages |
| `db` | PostgreSQL 18 | Users, plants, readings, rules, schedules, posts |

## API service layers

```
api/app/
  main.py          builds the app, wires the routers, maps service errors to HTTP status codes
  api/             API layer: REST endpoints (request/response models, auth dependency)
  mqtt_bridge.py   API layer for the boards: MQTT connection, subscribe and publish
  services/        Service layer: access checks, automation rules, alerts, board commands, auth
  data/            Data-access layer: all SQL, one module per table group
```

Each layer only calls the one below it. The app never touches the database. The schema can change
without the firmware or UI changing.

## Running

```bash
cp .env.example .env    # then set the passwords and JWT_SECRET
docker compose up -d --build
```

The API is on port 8000 (interactive docs at `http://localhost:8000/docs`), and MQTT is on 1883.
`db/01-database.sql` creates the schema on an empty database volume. To update an existing database,
run the files in `db/migrations/` in order (each one explains how).

## REST endpoints

Every endpoint except `/register`, `/login`, and `/health` needs `Authorization: Bearer <token>`,
using the token from `/register` or `/login`. GET parameters go in the query string.

| Endpoint | Method | Request | Response | Notes |
|---|---|---|---|---|
| `/register` | POST | `{username, name, email, password}` | `{token, user}` | Create account (FR10) |
| `/login` | POST | `{email, password}` | `{token, user}` | Login (FR10) |
| `/plant_readings` | GET | `plant_id, since?, until?, limit?` | `{plant_id, current, history, ranges}` | Sensor metrics (FR1-FR4). `ranges` has min/max/avg per metric over the window |
| `/actuators` | POST | `{plant_id, actuator, state, duration_s?}` | `{actuator, state}` | Turn the pump, grow light, or fan `on`/`off`, or back to `auto` (FR5) |
| `/rules` | PUT | `{plant_id, rules}` | `{plant_id, rules}` | Change the automation rules; `rules` is a partial update, and the full updated set is returned (FR6) |
| `/schedule` | POST | `{plant_id, days_of_week, time_of_day}` | `{schedule_id}` | Watering schedule; days are 0 = Sunday to 6 = Saturday (FR7) |
| `/link` | POST | `{device_id, plant_name}` | `{plant_id, linked}` | Link a new ESP32 to the account (FR11) |
| `/alerts` | GET | `plant_id` | `[{plant_id, type, message}]` | Problems with the plant or board (FR12) |
| `/posts` | POST | multipart form: `plant_id, body, image?` | `{post_id, image_url}` | Share a plant update (JPEG/PNG/WebP, 5 MB max) |
| `/posts` | GET | `limit?` | `[{post_id, username, plant_name, body, image_url, created_at}]` | Friends' posts, newest first |

These endpoints support the ones above:

| Endpoint | Method | Request | Response | Notes |
|---|---|---|---|---|
| `/plants` | GET | — | `[{id, name, device_id, online, last_seen_at, ...}]` | The user's plants |
| `/actuators` | GET | `plant_id` | `{water_pump, grow_light, fan, pump_fault, uploaded_at}` | Last state the board reported |
| `/rules` | GET | `plant_id` | `{plant_id, rules}` | Rules the board last reported |
| `/schedule` | GET | `plant_id` | `[{schedule_id, plant_id, days_of_week, time_of_day}]` | The plant's schedules |
| `/pump_reset` | POST | `{plant_id}` | `{plant_id, pump_reset}` | Clear a pump fault |
| `/health` | GET | — | `{mqtt_connected}` | No login needed |
| `/friends` | POST | `{username}` | `{username, status}` | Send a friend request. `status` is `accepted` if they had already asked you |
| `/friends/accept` | POST | `{username}` | `{username, status}` | Accept a request someone sent you |
| `/friends` | GET | — | `{friends, incoming, outgoing}` | Each is `[{user_id, username, name}]`; `incoming` are requests waiting for you |

Only a plant's owner can control it or change its settings. Accepted friends can also view its readings,
alerts, and schedules. Commands to a board that is offline return 409, because they aren't queued.

Alert types: `offline`, `no_data`, `stale_data`, `climate_sensor_error`, `light_sensor_error`, `pump_fault`,
`low_soil`, `high_temperature`, `high_humidity`.

## MQTT topics

| Topic | Direction | Data | Stored in |
|---|---|---|---|
| `roots/{device_id}/sensordata` | Board → Server | `{device_id, uptime_s, temp_c, humidity, soil_pct, soil_raw, light_lux, rssi}` | `readings` |
| `roots/{device_id}/actuators` | Board → Server | `{water_pump: {on, mode, override_s}, grow_light, fan, pump_fault, time_synced}` | `actuator_state` |
| `roots/{device_id}/rules` | Board → Server | The board's rule set | `plant_rules` |
| `roots/{device_id}/status` | Board → Server | `online` / `offline` (the broker sends `offline` as the board's Last Will) | `plants.online` |
| `roots/{device_id}/cmd` | Server → Board | `{cmd, target, state, duration_s}`; `cmd` is `actuator`, `rules`, `pump_reset`, or `actuators` | — |

See `firmware/README.md` for the payload details.
