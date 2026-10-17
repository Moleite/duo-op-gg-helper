# Tests and checks

> **Answers**: which tests exist · what each one proves · how a test loads the extension · what `npm run check` verifies.
> **Does not answer**: what to run before a commit → [`../git/workflow.md`](../git/workflow.md#steps)

The tests run with `node:test`, without a browser. Two development dependencies serve them: linkedom (a DOM in Node) and PGlite (Postgres in WASM). The extension loads neither.

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
| `tests/worker.test.mjs` | service worker: secret, sync between two browsers, Neon error |
| `tests/page.test.mjs` | full content script on a capture: hiding, dimming, sorting, blacklist, Show more, no loop |
| `tests/popup.test.mjs` | popup loaded from `popup.html`: import, profile |

## Loading the extension in a test

`tests/helpers/ext.mjs` runs the files of `extension/` with `vm.runInThisContext`, in the order of the manifest or of `background.js`. A file missing from the manifest is therefore also missing in the tests. `src: tests/helpers/ext.mjs#export const CONTENT`

`tests/helpers/fake-chrome.mjs` provides a fake `chrome.storage` with `onChanged`, and a fake Neon that runs each batch in PGlite under the role of the connection string.

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
| code | syntax, 400 lines per file, `innerHTML` forbidden in `extension/`, cited `docs/` paths |
| extension | files of the manifest, of `background.js` and of `popup.html` present, version in the `x.y.z` format |
| captures | no script and no real name in `DOM/` |

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run check` and `npm test` on each PR.
