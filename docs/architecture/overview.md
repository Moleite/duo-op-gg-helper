# Architecture overview

> **Answers**: how the extension is built · which Chrome contexts run · which module does what · the recompute cycle.
> **Does not answer**: where a setting goes → [`config.md`](config.md) · the Neon sync → [`../database/sync.md`](../database/sync.md)

DuoGG helper is a Chrome MV3 extension in plain JS, without a build and without a runtime dependency. It reads the post table of duo.op.gg, hides or dims the filtered posts, sorts the table and loads older posts. A panel on the page holds the filters, the blacklist and the post note.

## Framework choices

| Choice | Reason |
| ------ | ------ |
| plain JS, IIFE modules attached to `globalThis.DuoGG` | MV3 refuses `import` in a content script. Without a build, Chrome runs the working folder as it is. |
| `extension/` folder loaded by Chrome, tooling at the root | Chrome loads neither `node_modules/`, nor `docs/`, nor the captures. |
| no runtime dependency, three test dependencies | linkedom replays the captures of the site. PGlite runs the real SQL and the real RLS. fake-indexeddb runs the real code of the secret. |
| one writer of the storage: the service worker | `chrome.storage` has no transaction. |
| hiding by attributes, sorting by CSS `order` | React manages the rows of the table. Removing or moving one of its nodes breaks its next render. |

## Three contexts

| Context | Files | Role | Neon secret |
| ------- | ----- | ---- | ----------- |
| content script | `extension/src/**`, order of the manifest | reads the table, applies the rules, panel | never |
| service worker | `extension/background.js` | only writer of `chrome.storage.local`, only Neon client | yes |
| popup | `extension/popup.html` | profiles, blacklist import, connection string | input only |

The site shares its DOM with its own scripts and its trackers. The connection string therefore never goes through the page. `src: extension/src/store/worker.js#Secret refused from a tab`

## Modules

Each layer depends only on the layers above it in this table.

| Folder | Modules | Role |
| ------ | ------- | ---- |
| `extension/src/core/` | `config`, `lol`, `announce` | constants, positions and ranks, post note |
| `extension/src/data/` | `selectors`, `extract`, `api` | a post from the DOM or from the API |
| `extension/src/filters/` | `rules`, `engine` | rule registry, evaluation and sorting, without DOM |
| `extension/src/store/` | `model`, `sql`, `neon`, `secrets`, `worker`, `client` | local database, SQL, HTTP client, connection string, service worker |
| `extension/src/ui/` | `style`, `dom`, `rows`, `more`, `panel*`, `popup*` | rendering |
| `extension/src/app.js` | | orchestrator of the content script |

The functions of `core/`, `data/`, `filters/` and `store/model.js` are pure, or take their DOM root as an argument. The tests call them without Chrome ([`../run/tests.md`](../run/tests.md)).

## One post, two sources

A post (`Partner`, [`../vocabulary.md`](../vocabulary.md)) has the same shape, read from the DOM or from the API. The rule engine ignores its source.

- `extract.partner()` reads a row of the table. `src: extension/src/data/extract.js#function partner(li)`
- `api.fromApi()` reads a post of the GraphQL API. `src: extension/src/data/api.js#function fromApi(raw, now)`

The DOM truncates the list of wanted positions to two icons, followed by a `+`. After a first Show more, the API gives the full list, and `app.js` uses it for these rows. `src: extension/src/app.js#lookingForPartial: false`

## Recompute cycle

```
mutation of the table (React)       filter change (panel)
        |                                   |
   scan() reads the rows again        applyOp() locally, then a message
        |                            to the service worker -> storage.onChanged
        +---------------+-------------------+
                        |
                   recompute()
     engine.evaluate()  ->  one decision per post, with its reasons
     engine.order()     ->  display order
     rows.apply()       ->  data-duogg, data-duogg-why, style.order
     more.render()      ->  #duogg-more (older posts)
     panel.update()     ->  panel
```

A `MutationObserver` on `document.body` triggers `scan()`, after `config.observeDebounceMs` (150 ms). The mutations of the extension itself are ignored: `#duogg-more` and the two shadow roots. `src: extension/src/app.js#function isOurs(node)`

⚠️ A write of the extension that the observer would take for a mutation of the site would restart `scan()` forever. `rows.apply()` and `more.render()` therefore write only what changes. `tests/page.test.mjs` checks that no loop happens.

## Checking

```bash
npm test          # node:test: rules, extraction, API, database, worker, page, popup
npm run check     # documentation, style, generated files, syntax, budgets, captures
```
