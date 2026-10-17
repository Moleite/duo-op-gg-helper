-- ============================================================================
-- DuoGG - schema of the Neon database
--
-- Run in the SQL Editor of Neon, connected as `neondb_owner`, then run
-- db/grants.sql. Safe to run again (if not exists).
--
-- A row belongs to the Postgres role that wrote it (`owner`, filled by
-- default with current_user). The RLS policies of grants.sql limit each
-- login role to its own rows: two players share the database without seeing
-- each other (docs/database/neon.md).
--
-- No physical delete: a removed row carries `removed_at`. The pull thus
-- carries a removal to the other browsers of the same player.
--
-- tests/db.test.mjs runs this file and grants.sql in a local Postgres
-- (PGlite), then the queries of extension/src/store/sql.js.
-- ============================================================================

-- A profile = one LoL account of a player: what the post publishes, and the
-- filters of the panel while this profile is active.
create table if not exists player_profile (
  id               uuid primary key,
  owner            text not null default current_user,
  label            text not null,
  game_name        text,
  tag_line         text,
  region           text not null default 'euw',
  opgg_account     text,
  position         text,
  position2        text,
  champion         text,
  champion2        text,
  wanted_positions jsonb not null default '[]',
  queue_type       text not null default 'RANKED_SOLO',
  rank             text,
  note_template    text,
  filters          jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  removed_at       timestamptz
);

-- A player to avoid. The key is lower case `name#tag` (DuoGG.lol.riotKey):
-- the same player added from two browsers gives one row.
create table if not exists blacklist_entry (
  owner        text not null default current_user,
  player_key   text not null,
  game_name    text not null,
  tag_line     text,
  region       text,
  reason       text,
  note         text,
  position     text,
  rank         text,
  champion     text,
  partner_id   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  removed_at   timestamptz,
  primary key (owner, player_key)
);

create index if not exists player_profile_owner on player_profile (owner);
