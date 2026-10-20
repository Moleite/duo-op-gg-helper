# Local database and Neon sync

> **Answers**: where the extension keeps its data · when it calls Neon · how a change reaches the other browsers · why the service worker writes alone.
> **Does not answer**: creating the database → [`neon.md`](neon.md) · the columns → [`../generated/schema.md`](../generated/schema.md)

The extension writes locally first, in `chrome.storage.local`. Neon shares these data between the browsers of a player. Without a connection string, everything works locally.

## One writer

The service worker is the only context that writes `chrome.storage.local`. The panel and the popup send it messages. `chrome.storage` has no transaction: two contexts that rewrite the `db` key would overwrite each other. The service worker handles the operations one after the other. `src: extension/src/store/worker.js#function serial(fn)`

The accepted messages and operations are generated: [`../generated/operations.md`](../generated/operations.md).

The panel also applies the operation locally, with the same pure function (`model.applyOp`). The display follows the click without waiting for the service worker. `src: extension/src/app.js#setDb(D.model.applyOp(st.db, o, Date.now()))`

A response of the service worker can arrive after a later operation: the `page.open` response of the page load, for example, after a filter change. Such a response is stale, and the panel keeps its state. `chrome.storage.onChanged` brings the saved state. `src: extension/src/app.js#if (seq === dbSeq) setDb(r.db)`

## Rows to push

Each operation that touches a profile or a blacklist entry marks the row in `db.dirty`. The push sends the current state of the marked rows, not the history of the operations. An operation replayed gives the same state. `src: extension/src/store/model.js#function dirtyRows(db)`

Filters without a profile, the selection of the active profile and the position of the panel stay local.

## One sync, one round trip

`sync()` sends one batch, in one Neon transaction:

1. `current_user` and the database, for the message `Connected as …`;
2. the upserts of the marked rows;
3. a read of every profile and of the whole blacklist of the player.

The service worker then removes from the marked rows the ones that did not change during the call, and merges the read. `src: extension/src/store/model.js#function clearDirty(db0, pushed, now)`

The merge keeps a marked local row that is newer than the one of the server. Otherwise, the row of the server replaces the local row. `src: extension/src/store/model.js#function mergePull(db0, server, now)`

## When the database wakes up

| Trigger | Condition |
| ------- | --------- |
| Sync button of the popup | connection string saved |
| operation that marks a row | `env.pushDelayMs` (1.5 s) after the last one: a burst of clicks gives one call |
| a page of the site opens | last pull older than `config.neon.pullTtlMs` (6 h) |

No Neon call while reading the table, nor on a filter change without a profile.

## Sync error

An error leaves the rows marked, and `db.sync.error` keeps the message. The footer of the panel and the popup show it. The next sync sends the same rows again. `src: extension/src/store/worker.js#error: e.message, errorAt`

## Checking

`tests/worker.test.mjs` simulates two browsers of one player and a second player. The queries go through PGlite, with the real schema and the real RLS.
