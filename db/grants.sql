-- ============================================================================
-- DuoGG - groups, grants and RLS policies
--
-- Run after schema.sql, connected as `neondb_owner`. Safe to run again.
--
-- Two group roles carry the grants, neither logs in (nologin):
--   duogg-user  the extension: read, insert and update its own rows
--   duogg-read  read-only access to every row, for scripts/sql.mjs
-- Each player gets a login role, member of one group only
-- (db/create-role.sql).
--
-- ⚠️ Double quotes are required: a dash is not an identifier character.
--    Without quotes, `duogg-user` reads as a subtraction.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'duogg-user') then
    create role "duogg-user" nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'duogg-read') then
    create role "duogg-read" nologin;
  end if;
end $$;

grant usage on schema public to "duogg-user", "duogg-read";

-- No delete, no truncate: a removal goes through `removed_at`.
grant select, insert on player_profile, blacklist_entry to "duogg-user";

-- Clean start: an earlier table-wide `grant update` would cancel the column
-- list below.
revoke update on player_profile, blacklist_entry from "duogg-user";

-- `owner`, `id`, `player_key` and `created_at` never change.
grant update (label, game_name, tag_line, region, opgg_account, position, position2,
              champion, champion2, wanted_positions, queue_type, rank, note_template,
              filters, updated_at, removed_at)
   on player_profile to "duogg-user";
grant update (game_name, tag_line, region, reason, note, position, rank, champion,
              partner_id, updated_at, removed_at)
   on blacklist_entry to "duogg-user";

grant select on player_profile, blacklist_entry to "duogg-read";

-- RLS: each login role sees and writes its own rows only.
-- `force` is absent: neondb_owner keeps the full view in the console.
alter table player_profile enable row level security;
alter table blacklist_entry enable row level security;

drop policy if exists own_rows on player_profile;
create policy own_rows on player_profile
  for all to "duogg-user"
  using (owner = current_user)
  with check (owner = current_user);

drop policy if exists own_rows on blacklist_entry;
create policy own_rows on blacklist_entry
  for all to "duogg-user"
  using (owner = current_user)
  with check (owner = current_user);

drop policy if exists read_all on player_profile;
create policy read_all on player_profile for select to "duogg-read" using (true);

drop policy if exists read_all on blacklist_entry;
create policy read_all on blacklist_entry for select to "duogg-read" using (true);
