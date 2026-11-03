-- Brings a database created before the architecture document (Fall 2026) up to the current schema:
-- users get a username and name, and the posts table is added.
-- Run 001-device-status-and-rules.sql first if the database is older than that.
-- Not run automatically (initdb only runs files directly in db/, and only on an empty volume).
-- Safe to run more than once:
--   docker exec -i roots-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migrations/002-users-and-posts.sql
BEGIN;

-- Existing accounts get a username from their email address (plus part of their id so it is unique)
-- and use it as their name until they change it.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE users SET username = split_part(email, '@', 1) || '-' || left(id::text, 4) WHERE username IS NULL;
UPDATE users SET name = username WHERE name IS NULL;
ALTER TABLE users
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username));

CREATE INDEX IF NOT EXISTS idx_plants_owner ON plants (owner_id);
CREATE INDEX IF NOT EXISTS idx_watering_schedules_plant ON watering_schedules (plant_id);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_time ON posts (user_id, created_at DESC);

COMMIT;
