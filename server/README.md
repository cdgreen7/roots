# Roots Server

Backend for Roots: a FastAPI REST API, a Mosquitto MQTT broker for the boards, and a PostgreSQL database,
all run with Docker Compose on our AWS EC2 instance. Caddy provides HTTPS.

## Setup

1. Copy `.env.example` to `.env` and set the passwords and `JWT_SECRET`.
2. Create `mosquitto/passwd` with a user for the API (matching `MQTT_USER`/`MQTT_PASS` in `.env`) and one for the boards:
   ```bash
   docker run --rm -it -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 mosquitto_passwd -c /m/passwd roots-api
   docker run --rm -it -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 mosquitto_passwd /m/passwd roots-board
   ```
3. Start everything:
   ```bash
   docker compose up -d --build
   ```

## Usage

- API: `https://roots-plants.duckdns.org` (interactive docs at `/docs`)
- Boards connect to MQTT over TLS on port 8883. Topics and payloads are in `firmware/README.md`.

## Updating the server

```bash
cd ~/roots && git pull && cd server && docker compose up -d --build
```

## Certificate renewal

Caddy renews the HTTPS certificate automatically, but Mosquitto only loads it at startup. A weekly cron job on the server restarts it:

```
0 10 * * 1 docker restart roots-mqtt
```
