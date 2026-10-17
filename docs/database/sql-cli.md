# SQL query from the terminal

> **Answers**: querying the Neon database from the terminal · with which role · what that role can do.
> **Does not answer**: creating a role → [`neon.md`](neon.md) · the columns → [`../generated/schema.md`](../generated/schema.md)

`scripts/sql.mjs` runs a read-only query on the database. It checks a statement about the data before coding. Postgres refuses any write from its role.

## Prerequisites

1. A login role that is a member of `duogg-read`, created by `db/create-role.sql` with `v_group = 'duogg-read'`. Suggested name: `duogg_agent`.
2. Its connection string in `DUOGG_NEON_URL_READ`, in the `.env` file at the root (created by `npm run setup`, git-ignored):

```bash
DUOGG_NEON_URL_READ=postgresql://duogg_agent:<password>@<host>/neondb?sslmode=require
```

## Running a query

```bash
npm run sql -- "select owner, count(*) from blacklist_entry where removed_at is null group by owner"
node scripts/sql.mjs "select label, opgg_account, updated_at from player_profile"
```

The script prints the connected role, then the rows. `src: scripts/sql.mjs#select current_user as role`

## What the role sees

The `read_all` policy gives `duogg-read` every row of every player, blacklist notes included. Keep this role for the owner of the project and their agents. `src: db/grants.sql#create policy read_all on blacklist_entry`

Each call wakes the database up: group the questions into one query.
