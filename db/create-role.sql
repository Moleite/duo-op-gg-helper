-- ============================================================================
-- DuoGG - create the login role of a player
--
-- Run in the SQL Editor of Neon, connected as `neondb_owner`, after
-- schema.sql and grants.sql. Safe to run again: an existing role only gets
-- its new password.
--
-- ⚠️ This file is versioned: never leave a real password in it. Type the
--    password in the SQL Editor only.
--
-- ⚠️ A role created from the Neon console becomes a member of
--    `neon_superuser` and bypasses RLS (BYPASSRLS): it would see the rows of
--    every player. Create each role with this script. Check (a) below
--    detects that case.
--
-- Naming: `duogg_<player>` for a login, `duogg-<grant>` for a group. The name
-- of the login is the value of `owner` in the tables: renaming it requires
-- migrating those rows.
-- ============================================================================
do $$
declare
  v_role     text := 'duogg_player';                     -- <- to adapt
  v_password text := 'REPLACE-ME-long-password';         -- <- to adapt
  v_group    text := 'duogg-user';                       -- <- or 'duogg-read'
begin
  if v_password = 'REPLACE-ME-long-password' then
    raise exception 'Replace v_password before running this script.';
  end if;
  if v_group not in ('duogg-user', 'duogg-read') then
    raise exception 'v_group must be duogg-user or duogg-read (got: %).', v_group;
  end if;
  if v_role = v_group then
    raise exception '% carries the grants and does not log in: pick a login name.', v_group;
  end if;
  if not exists (select 1 from pg_roles where rolname = v_group) then
    raise exception 'Group % is missing: run db/grants.sql first.', v_group;
  end if;

  if exists (select 1 from pg_roles where rolname = v_role) then
    execute format('alter role %I with login password %L', v_role, v_password);
    raise notice 'Role % already exists: password redefined.', v_role;
  else
    execute format('create role %I with login password %L', v_role, v_password);
    raise notice 'Role % created.', v_role;
  end if;
  execute format('grant %I to %I with inherit true', v_group, v_role);
end $$;

-- Checks
-- a) Groups of the role: the chosen group, and only that one. A
--    `neon_superuser` row means a role created from the console.
select m.rolname as member_of
  from pg_auth_members am
  join pg_roles r on r.oid = am.member
  join pg_roles m on m.oid = am.roleid
 where r.rolname = 'duogg_player';   -- <- to adapt

-- b) End to end: the popup of the extension, Sync button, shows
--    `Connected as duogg_player on neondb`.
