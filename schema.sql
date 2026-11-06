-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,          -- stored lowercase
  password    text not null,                 -- bcrypt hash, never the real password
  data        jsonb not null default '{}'::jsonb,   -- stamps, friends, delay history
  countries   int  not null default 0,
  trips       int  not null default 0,
  minutes     int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists users_minutes_idx on users (minutes desc);

-- Lock the table so nobody can read it from a browser with the public key.
-- Only the server (service role key) can touch it.
alter table users enable row level security;
