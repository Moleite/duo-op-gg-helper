# 2026-10-20: the connection string leaves chrome.storage.local

> **Answers**: why the connection string lives in IndexedDB · what changed in 2.1.0 · how a 2.0.2 string moves.
> **Does not answer**: the roles and RLS → [`../database/neon.md`](../database/neon.md)

Dated story: it is never rewritten. A fact that becomes wrong is corrected in a new file.

## Finding

Up to 2.0.2 the service worker saved the string in `chrome.storage.local`, key `secrets`. Only a convention kept the content script away from it: `chrome.storage.local` is readable by every content script. `store/client.js` listens to `chrome.storage.onChanged`, and each change event carries its new value into the process of duo.op.gg. A save of the string therefore reached the process of the site.

BotEd_MDF made the same finding in its 4.0.0, and moved its keys to IndexedDB.

## Decision

- The string lives in the IndexedDB `duogg-secrets` of the origin of the extension. The service worker and the popup share this origin. A content script opens the IndexedDB of the site, never this one.
- `extension/src/store/secrets.js` is loaded by `background.js` only. `npm run check` refuses a content script that names `indexedDB` or `DuoGG.secrets`.
- The tests run the real IndexedDB code on `fake-indexeddb`, a dependency of the tests only.

## Move of an existing string

The first read of the service worker moves a 2.0.2 string to IndexedDB, then removes the `secrets` key. A string already in IndexedDB wins over a stale copy. Nothing to type again after the update. `src: extension/src/store/secrets.js#async function get(storage)`
