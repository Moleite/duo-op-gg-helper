# Database tables

> **Answers**: what each table is for · what a row represents · how to change the schema.
> **Does not answer**: the list of columns → [`../generated/schema.md`](../generated/schema.md) · the grants → [`neon.md`](neon.md#roles-and-grants)

The database has two tables. Each row carries `owner`, filled by Postgres with `current_user` on insert. No row is deleted: a removal sets `removed_at`.

## `player_profile`

A row is one LoL account of a player: a profile. It holds what the post publishes (Riot ID, positions, champions, wanted positions, rank, note template) and the filters of the panel while this profile is active (`filters`, as JSON).

- `id` is a UUID created by the extension: a profile exists before its first sync.
- `opgg_account` is the name of the op.gg account shown by the site. When the site opens, the profile whose value matches becomes active. `src: extension/src/store/worker.js#function pageOpen(account)`
- `wanted_positions` is a JSON array of positions (`["SUPPORT","JUNGLE"]`).

## `blacklist_entry`

A row is a player to avoid, for one owner. The primary key is `(owner, player_key)`.

- `player_key` is lower case `name#tag`, or the name alone for an entry without a tag. `src: extension/src/core/lol.js#function riotKey(gameName, tagLine)`
- Two players who blacklist the same person each have their own row.
- `reason`, `note`, `position`, `rank`, `champion` and `partner_id` keep the context of the addition.

## Write conflicts

A push writes the current state of a row. The row in the database is replaced only when the row sent is newer (`updated_at`). A browser that stayed offline therefore does not overwrite a newer version. `src: extension/src/store/sql.js#where blacklist_entry.updated_at <= excluded.updated_at`

## Changing the schema

1. Write `db/migrations/<NNN>-<subject>.sql`, safe to run again (`if not exists`, `add column if not exists`).
2. Report the change in `db/schema.sql`, which always describes the final state.
3. When the extension writes the column: add it to the `grant update` of `db/grants.sql`, then to the queries of `extension/src/store/sql.js`.
4. Run `npm test`: `tests/db.test.mjs` runs the schema, the grants and the queries.
5. Run `npm run gen`: the list of columns is generated again.
6. In the task report, name the migration to run in Neon. A database that is behind makes the sync fail with `column "…" does not exist`.

The `db/migrations/` folder holds no migration in v2.0.0: the starting schema is `db/schema.sql`.
