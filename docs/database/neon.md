# Neon database: creation, roles, security

> **Answers**: creating the database · adding a player · why each player sees only their data · where the connection string lives · what a role can do.
> **Does not answer**: the columns → [`schema.md`](schema.md) · the sync → [`sync.md`](sync.md)

The database is a Neon project (Postgres), on the free plan. Several players share it. Each player has their own login role, and RLS limits each role to its own rows. Without Neon, the extension works: everything stays in the browser.

## Creating the database

1. On [console.neon.tech](https://console.neon.tech), create a project.
2. In the SQL Editor, connected as `neondb_owner`, run `db/schema.sql`, then `db/grants.sql`. Both are safe to run again.
3. For each player, run `db/create-role.sql` after replacing `v_role` and `v_password`.
4. Write the connection string of the player: `postgresql://<role>:<password>@<host>/neondb?sslmode=require`. Copy the host from Connect, and replace the `neondb_owner` role.
5. Paste it in the popup of the extension, Neon tab, then click Sync.

The message `Connected as duogg_<player> on neondb` proves the role. It comes from `current_user`, read by the server in the transaction of the sync. `src: extension/src/store/sql.js#current_user as role`

⚠️ The Neon console offers the `neondb_owner` role by default. This role bypasses RLS and sees the rows of every player. A role shown other than `duogg_<player>` means the wrong string.

## Roles and grants

| Role | Type | Grants |
| ---- | ---- | ------ |
| `duogg-user` | group, no login | `select`, `insert`, `update` column by column, on its own rows |
| `duogg-read` | group, no login | `select` on every row (`scripts/sql.mjs`) |
| `duogg_<player>` | login | member of one group only |

- No `delete`, no `truncate`: a removal sets `removed_at`.
- `owner`, `id`, `player_key` and `created_at` never change: no `update` is granted on these columns.
- RLS compares `owner` with `current_user`, for reads and writes. `src: db/grants.sql#using (owner = current_user)`
- `tests/db.test.mjs` checks each point in PGlite: a role neither reads nor changes the rows of another, `delete` fails.

⚠️ A role created from the Neon console becomes a member of `neon_superuser` and bypasses RLS. Create each role with `db/create-role.sql`, whose check (a) detects that case.

⚠️ The name of the login role is the value of `owner`. Renaming a role detaches its rows: they stay in the database, invisible to the new name.

## Where the connection string lives

| Location | Reader |
| -------- | ------ |
| `chrome.storage.local`, key `secrets`, typed in the popup | service worker only |

A content script never reads it, and the service worker refuses a `secret.set` message from a tab. The `state` response does not contain it. `src: extension/src/store/worker.js#function fromTab(sender)`

Anyone with access to the Windows session can read the storage of the Chrome profile. The restricted role and RLS limit the damage: a stolen string gives the data of one player, without any possible delete.

## Changing a password, removing a player

- Password: run `db/create-role.sql` again with the same `v_role`. The player pastes their new string.
- Removing a player: `revoke "duogg-user" from "duogg_<player>";`. Their rows stay in the database.

## Database wake-ups

The free plan suspends the database and bills the compute time. The extension wakes the database only on an action: manual sync, push after a change, pull when the site opens with a cache older than `config.neon.pullTtlMs` (6 h). The details are in [`sync.md`](sync.md).
