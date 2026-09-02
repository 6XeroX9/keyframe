-- ─────────────────────────────────────────────────────────────────────────────
-- Keyframe — Supabase SQL Setup
-- Run this entire script in the Supabase SQL Editor (one shot).
-- It uses IF NOT EXISTS / IF NOT EXISTS everywhere so it's safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text        NOT NULL,
  email         text        UNIQUE NOT NULL,
  password_hash text,
  role          text        NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Add password_hash column if table already existed without it
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- ── CREATORS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creators (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  specialty        text,
  youtube_url      text,
  handle           text,
  subscriber_count text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── VIDEOS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  youtube_url text,
  youtube_id  text,
  creator_id  uuid        REFERENCES creators(id) ON DELETE SET NULL,
  level       text,
  description text,
  tags        text[]      DEFAULT '{}',
  duration    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── PLAYLISTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  creator_id  uuid        REFERENCES creators(id) ON DELETE SET NULL,
  video_ids   uuid[]      DEFAULT '{}',
  featured    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── COURSES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  educator      text,
  description   text,
  price         text,
  affiliate_url text,
  thumbnail_url text,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── DISABLE ROW-LEVEL SECURITY (service_role key bypasses, but belt-and-suspenders)
ALTER TABLE users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE creators  DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos    DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses   DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings  DISABLE ROW LEVEL SECURITY;
