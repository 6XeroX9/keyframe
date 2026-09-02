const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/*
  SUPABASE TABLE DEFINITIONS — run these in your Supabase SQL editor:

  -- users
  CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp DEFAULT now()
  );

  -- creators
  CREATE TABLE creators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    specialty text,
    youtube_url text,
    handle text,
    subscriber_count text,
    created_at timestamp DEFAULT now()
  );

  -- videos
  CREATE TABLE videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    youtube_url text NOT NULL,
    youtube_id text,
    creator_id uuid REFERENCES creators(id) ON DELETE SET NULL,
    level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    description text,
    tags text[],
    duration text,
    created_at timestamp DEFAULT now()
  );

  -- playlists
  CREATE TABLE playlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    creator_id uuid REFERENCES creators(id) ON DELETE SET NULL,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    featured boolean DEFAULT false,
    video_ids uuid[],
    created_at timestamp DEFAULT now()
  );

  -- courses
  CREATE TABLE courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    educator text,
    description text,
    price text,
    affiliate_url text,
    thumbnail_url text,
    active boolean DEFAULT true,
    created_at timestamp DEFAULT now()
  );

  -- settings
  CREATE TABLE settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text,
    updated_at timestamp DEFAULT now()
  );
*/

// Use service_role key on the backend — bypasses RLS, safe for server-only use
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

module.exports = supabase;
