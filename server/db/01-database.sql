CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE USERS ( 
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email TEXT UNIQUE NOT NULL,
pw_hash TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE plants (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
name TEXT NOT NULL,
device_id TEXT UNIQUE,
online BOOLEAN NOT NULL DEFAULT false,
last_seen_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE readings (
id BIGINT GENERATED ALWAYS AS IDENTITY,
plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
temp DOUBLE PRECISION,
humidity DOUBLE PRECISION,
soil_moisture DOUBLE PRECISION,
light DOUBLE PRECISION,
recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_readings_plant_time ON readings (plant_id, recorded_at DESC);
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
CREATE TABLE actuator_state (
plant_id UUID PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
water_pump BOOLEAN NOT NULL DEFAULT false,
grow_light BOOLEAN NOT NULL DEFAULT false,
fan BOOLEAN NOT NULL DEFAULT false,
pump_fault BOOLEAN NOT NULL DEFAULT false,
uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE watering_schedules (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
days_of_week SMALLINT[] NOT NULL,
time_of_day TIME NOT NULL
);
CREATE TABLE friendships (
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
status TEXT NOT NULL DEFAULT 'pending',
PRIMARY KEY (user_id, friend_id)
);