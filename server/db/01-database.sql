/*
  Roots database schema.
  Postgres runs this automatically the first time the db container starts with an empty volume (see docker-compose.yml).
  To bring an existing database up to date, run the files in db/migrations instead.
*/
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- users: one row per account. pw_hash is the scrypt hash from services/auth.py, never the password itself.
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
username TEXT NOT NULL,
name TEXT NOT NULL,
email TEXT UNIQUE NOT NULL,
pw_hash TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Usernames are unique regardless of case ("Caden" and "caden" are the same user).
CREATE UNIQUE INDEX users_username_lower ON users (lower(username));

-- plants: one row per plant. device_id is the linked board ("roots-xxxxxx", printed at boot);
-- online and last_seen_at are updated from the board's MQTT messages.
CREATE TABLE plants (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
name TEXT NOT NULL,
device_id TEXT UNIQUE,
online BOOLEAN NOT NULL DEFAULT false,
last_seen_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plants_owner ON plants (owner_id);

-- readings: one row per sensor message from a board. A NULL value means that sensor failed to read.
CREATE TABLE readings (
id BIGINT GENERATED ALWAYS AS IDENTITY,
plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
temp DOUBLE PRECISION,
humidity DOUBLE PRECISION,
soil_moisture DOUBLE PRECISION,
light DOUBLE PRECISION,
recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Speeds up fetching a plant's readings newest first (the app's history and current reading).
CREATE INDEX idx_readings_plant_time ON readings (plant_id, recorded_at DESC);

-- plant_rules: the automation rules the board last reported. The board stores and runs them itself;
-- this is a copy so the app can show them. Column names match the firmware's rules message.
CREATE TABLE plant_rules (
plant_id UUID PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
water_pump_auto BOOLEAN,
grow_light_auto BOOLEAN,
fan_auto BOOLEAN,
soil_min DOUBLE PRECISION,
soil_target DOUBLE PRECISION,
pulse_s INT,
soak_s INT,
max_pulses INT,
temp_max DOUBLE PRECISION,
humidity_max DOUBLE PRECISION,
light_on_hour INT,
light_on_hours INT,
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- actuator_state: whether the pump, grow light, and fan are on, and the pump fault flag, as the board last reported.
CREATE TABLE actuator_state (
plant_id UUID PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
water_pump BOOLEAN NOT NULL DEFAULT false,
grow_light BOOLEAN NOT NULL DEFAULT false,
fan BOOLEAN NOT NULL DEFAULT false,
pump_fault BOOLEAN NOT NULL DEFAULT false,
uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- watering_schedules: when a user plans to water a plant (shown on the app's calendar).
-- days_of_week uses 0 = Sunday through 6 = Saturday (the same as JavaScript's Date.getDay()).
CREATE TABLE watering_schedules (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
days_of_week SMALLINT[] NOT NULL,
time_of_day TIME NOT NULL
);
CREATE INDEX idx_watering_schedules_plant ON watering_schedules (plant_id);

-- friendships: user_id sent the request and friend_id received it.
-- status is 'pending' until the friend accepts, then 'accepted'. Either direction of an accepted row counts.
CREATE TABLE friendships (
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
PRIMARY KEY (user_id, friend_id),
CHECK (user_id <> friend_id)
);

-- posts: plant updates users share with their friends. image_url points to a file under /uploads, or is NULL.
CREATE TABLE posts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
body TEXT NOT NULL DEFAULT '',
image_url TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_user_time ON posts (user_id, created_at DESC);
