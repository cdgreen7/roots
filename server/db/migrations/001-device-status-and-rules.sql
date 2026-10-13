-- Brings a database created from the original 01-database.sql up to the current schema.
-- Not run automatically (initdb only runs files directly in db/, and only on an empty volume).
-- Safe to run more than once:
--   docker exec -i roots-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/001-device-status-and-rules.sql
BEGIN;

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- REAL -> DOUBLE PRECISION. Rounding drops the float noise REAL adds (21.3 -> 21.2999992);
-- the firmware only sends 1 decimal place.
ALTER TABLE readings
  ALTER COLUMN temp TYPE DOUBLE PRECISION USING round(temp::numeric, 1),
  ALTER COLUMN humidity TYPE DOUBLE PRECISION USING round(humidity::numeric, 1),
  ALTER COLUMN soil_moisture TYPE DOUBLE PRECISION USING round(soil_moisture::numeric, 1),
  ALTER COLUMN light TYPE DOUBLE PRECISION USING round(light::numeric, 1);

-- Actuators are the water pump, grow light and fan (no heat lamp).
ALTER TABLE actuator_state
  DROP COLUMN IF EXISTS heat_lamp,
  ADD COLUMN IF NOT EXISTS fan BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pump_fault BOOLEAN NOT NULL DEFAULT false;

-- plant_rules mirrors the rule set the board stores and publishes.
ALTER TABLE plant_rules
  DROP COLUMN IF EXISTS temp_min,
  DROP COLUMN IF EXISTS humidity_min,
  ADD COLUMN IF NOT EXISTS water_pump_auto BOOLEAN,
  ADD COLUMN IF NOT EXISTS grow_light_auto BOOLEAN,
  ADD COLUMN IF NOT EXISTS fan_auto BOOLEAN,
  ADD COLUMN IF NOT EXISTS soil_target DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pulse_s INT,
  ADD COLUMN IF NOT EXISTS soak_s INT,
  ADD COLUMN IF NOT EXISTS max_pulses INT,
  ADD COLUMN IF NOT EXISTS light_on_hour INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ALTER COLUMN soil_min TYPE DOUBLE PRECISION USING round(soil_min::numeric, 2),
  ALTER COLUMN temp_max TYPE DOUBLE PRECISION USING round(temp_max::numeric, 2),
  ALTER COLUMN humidity_max TYPE DOUBLE PRECISION USING round(humidity_max::numeric, 2);

COMMIT;
