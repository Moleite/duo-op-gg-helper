# Tests and checks

> **Answers**: which tests exist · what each one proves · how a test loads the extension · what `npm run check` verifies.
> **Does not answer**: what to run before a commit → [`../git/workflow.md`](../git/workflow.md#steps)

The tests run with `node:test`, without a browser. Three development dependencies serve them: linkedom (a DOM in Node), PGlite (Postgres in WASM) and fake-indexeddb (IndexedDB in Node). The extension loads none of them.

## Commands

```bash
npm test          # every tests/*.test.mjs file
npm run check     # documentation, style, generated files, code, captures
node --test tests/rules.test.mjs   # one file
```

## What each file proves

| File | Proves |
| ---- | ------ |
| `tests/lol.test.mjs` | reading ranks and positions, symmetry of the rank table |
| `tests/rules.test.mjs` | each rule, missing data included, and the sorts |
| `tests/extract.test.mjs` | each capture of `DOM/` gives complete and correct posts |
| `tests/api.test.mjs` | conversion of an API post, cursor, GraphQL call |
| `tests/model.test.mjs` | idempotent operations, v1 blacklist import, post note |
| `tests/db.test.mjs` | `db/schema.sql`, `db/grants.sql` and the queries of the extension in Postgres, RLS included |
| `tests/worker.test.mjs` | service worker: secret out of `chrome.storage.local`, move of a 2.0.2 string, sync between two browsers, Neon error, version on the disk |
| `tests/page.test.mjs` | full content script on a capture: hiding, dimming, sorting, blacklist, Show more, no loop, ping, update notice, extension reloaded under the page |
| `tests/popup.test.mjs` | popup loaded from `popup.html`: banner of a page without a script, import, profile |
| `tests/version.test.mjs` | texts of the update notices, reload of the extension before F5 |
| `tests/style.test.mjs` | extraction of the code comments that `npm run check` style-checks, forbidden patterns |

## Loading the extension in a test

`tests/helpers/ext.mjs` runs the files of `extension/` with `vm.runInThisContext`, in the order of the manifest or of `background.js`. A file missing from the manifest is therefore also missing in the tests. `src: tests/helpers/ext.mjs#export const CONTENT`

`tests/helpers/fake-chrome.mjs` provides a fake `chrome.storage` with `onChanged`, and a fake Neon that runs each batch in PGlite under the role of the connection string.

A test that waits for the worker uses `until(cond)`, never a fixed delay. A message to the worker goes through IndexedDB and `chrome.storage`: 30 ms pass on a development machine and fail on the CI runner. `src: tests/helpers/ext.mjs#export async function until(cond, ms = 2000)`

## Limits

- The CSS, the layout and the dragging of the panel show only in Chrome.
- The API of the site is not called: `tests/api.test.mjs` replays a recorded response.
- A `select` has no `value` in linkedom: the tests go through the actions of `DuoGG.app`.

## What `npm run check` verifies

| Area | Check |
| ---- | ----- |
| documentation | budgets, routing header, links and anchors, cited paths, `src:` pointers, style, page missing from the index (warning) |
| language | no accented letter in the documentation, the code, the SQL or the tests |
| generation | `docs/generated/` equal to the output of `npm run gen` |
| code | syntax, 400 lines per file, cited `docs/` paths and anchors, style of the comments (JS, SQL, HTML) |
| HTML parsing | forbidden in `extension/`: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `createContextualFragment`, `setHTMLUnsafe`, `document.write`, `srcdoc` |
| files | only the files of the repository: tracked, or new and not git-ignored. A git-ignored file present on the machine counts as missing, like in CI |
| extension | files of the manifest, of `background.js` and of `popup.html` present, version in the `x.y.z` format |
| secrets | `.env` git-ignored, Variables table of `getting-started.md` equal to the keys of `.env.example`, no content script that reaches `indexedDB` or `DuoGG.secrets` |
| captures | no script and no real name in `DOM/` |

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run check` and `npm test` on each PR.
