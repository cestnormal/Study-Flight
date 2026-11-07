-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again later: it only adds what is missing.

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,          -- stored lowercase
  password    text not null,                 -- bcrypt hash, never the real password
  data        jsonb not null default '{}'::jsonb,   -- stamps, friends, delay history, medals
  countries   int  not null default 0,
  trips       int  not null default 0,
  minutes     int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Password recovery by email (optional for each account)
alter table users add column if not exists email      text;         -- stored lowercase
alter table users add column if not exists reset_hash text;         -- hash of the reset link token
alter table users add column if not exists reset_exp  timestamptz;  -- when the reset link stops working
alter table users add column if not exists pw_at      timestamptz;  -- when the password last changed

create index if not exists users_minutes_idx on users (minutes desc);
create unique index if not exists users_email_idx on users (email) where email is not null;
create index if not exists users_reset_idx on users (reset_hash) where reset_hash is not null;

-- Lock the table so nobody can read it from a browser with the public key.
-- Only the server (service role key) can touch it.
alter table users enable row level security;
