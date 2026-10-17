# duo-op-gg-helper agent guide

Chrome MV3 extension that improves the duo table of duo.op.gg: rules that hide or dim posts, sorting, blacklist, older posts through the API of the site, post note, profiles and blacklist synced in Neon per player. Plain JS, without a build and without a runtime dependency.
Repository: `github.com/Moleite/duo-op-gg-helper` (public). Current version: `extension/manifest.json`.

This is the only file that is always loaded. Load every other file only when needed, one or two at a time.

## Language

Write everything in English: documentation, code comments, displayed texts, SQL, commits, PRs. The conversation with the owner is in French; the repository stays in English. `npm run check` refuses an accented letter ([`docs/STYLE.md`](docs/STYLE.md#language)).

## Protocol for every task

1. Read this file in full: summary, routing and rules.
2. Find the page of the task in the routing table, then refine with [`docs/00-INDEX.md`](docs/00-INDEX.md), or [`docs/01-SYMPTOMS.md`](docs/01-SYMPTOMS.md) for a problem. Every page is under 8 KB and starts with an *Answers / Does not answer* header. Never load a whole folder.
3. Before writing a fact, look in [`docs/generated/`](docs/00-INDEX.md#facts-generated-from-the-code): rules, selectors, columns and messages are taken from the code there. Link, never copy.
4. Create the branch before editing, from an up-to-date `main`: `git fetch origin && git checkout -B <branch> origin/main`. No direct work on `main`.
5. Apply the rules below. On an ambiguous product decision, offer two or three options.
6. When a useful change is done:
   1. update the affected documentation, and run `npm run gen` when a registry or the schema changed;
   2. run `npm run check` and `npm test`. A failure blocks the commit;
   3. change the version in `extension/manifest.json`, one version per PR;
   4. commit, then push the branch;
   5. report: files, settings with their values, displayed texts quoted word for word, remaining manual actions.

   A change that rests on an assumption that can still be checked is not done (rule 7).

## Routing

| Task | Page |
| ---- | ---- |
| Framework, Chrome contexts, modules, recompute cycle | [`docs/architecture/overview.md`](docs/architecture/overview.md) |
| Where a setting goes | [`docs/architecture/config.md`](docs/architecture/config.md) |
| Reading a row of the site, repairing a selector | [`docs/architecture/dom-selectors.md`](docs/architecture/dom-selectors.md) |
| Adding or pseudonymizing a capture of `DOM/` | [`docs/architecture/dom-captures.md`](docs/architecture/dom-captures.md) |
| GraphQL API of the site, Show more, posting | [`docs/architecture/site-api.md`](docs/architecture/site-api.md) |
| Panel, popup, hiding without breaking React | [`docs/architecture/panel.md`](docs/architecture/panel.md) |
| Adding or changing a rule, a sort | [`docs/filters/rules.md`](docs/filters/rules.md) |
| Rank compatibility | [`docs/filters/ranks.md`](docs/filters/ranks.md) |
| Tables, changing the schema | [`docs/database/schema.md`](docs/database/schema.md) |
| Local database, sync, Neon wake-ups | [`docs/database/sync.md`](docs/database/sync.md) |
| Creating the database, roles, RLS, security | [`docs/database/neon.md`](docs/database/neon.md) |
| SQL query from the terminal | [`docs/database/sql-cli.md`](docs/database/sql-cli.md) |
| Installing, reloading, configuring | [`docs/run/getting-started.md`](docs/run/getting-started.md) |
| Tests and checks | [`docs/run/tests.md`](docs/run/tests.md) |
| Branching, committing, versioning, green light | [`docs/git/workflow.md`](docs/git/workflow.md) |
| Opening a PR, merging | [`docs/git/pull-requests.md`](docs/git/pull-requests.md) |
| The v1, its import, the v1 blacklist | [`docs/project/v1.md`](docs/project/v1.md) |
| Next task, open checks | [`docs/project/todo.md`](docs/project/todo.md) |
| Writing documentation or a comment | [`docs/STYLE.md`](docs/STYLE.md) |
| Splitting a page, budgets, layers | [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) |
| Name of a notion | [`docs/vocabulary.md`](docs/vocabulary.md) |
| Why it is built this way | [`docs/journal/`](docs/journal/): search with `grep`, never load it whole |

The clone of the owner is in `c:\git\moleite\duo-op-gg-helper`.

Claude Code reads `CLAUDE.md`, which imports this file and holds nothing else. An instruction for agents is written here, never in the memory or the settings of one tool: it would apply to that tool only, on one machine.

## Structure

```
extension/               folder loaded by Chrome (chrome://extensions)
  manifest.json          order of the content scripts = order of the dependencies
  background.js          service worker: only writer of the storage, only Neon client
  popup.html, popup.js   profiles, blacklist import, connection string
  src/core/              config, lol (positions, ranks), announce
  src/data/              selectors, extract (DOM), api (GraphQL of the site)
  src/filters/           rules (registry), engine (evaluation, sorting)
  src/store/             model (pure), sql, neon, worker, client
  src/ui/                style, dom, rows, more, panel*, popup*
  src/app.js             orchestrator of the content script
db/                      schema.sql, grants.sql (RLS), create-role.sql, migrations/
DOM/                     pseudonymized captures of the site: only reference for the selectors
docs/                    documentation per task; docs/generated/ is generated
scripts/                 check, generate, clean-dom, style, sql, make-icons
tests/                   node:test, linkedom, PGlite
```

## Rules

1. **No runtime dependency, no build.** Each module is an IIFE attached to `globalThis.DuoGG`. The dependencies of `package.json` serve the tests only.
2. **Hide, never delete.** The extension removes, moves and creates no node that React manages. It sets attributes and the `order` property. An identical write is not repeated: it would restart the observer ([`docs/architecture/overview.md`](docs/architecture/overview.md#recompute-cycle)).
3. **The connection string never touches the page.** Only the service worker and the popup read it. Nothing secret in a content script, the panel or the console of the page.
4. **No `innerHTML` in `extension/`.** The notes and names of other players are untrusted data: `extension/src/ui/dom.js` goes through `textContent`.
5. **One writer of the storage: the service worker.** The other contexts send idempotent operations ([`docs/database/sync.md`](docs/database/sync.md)).
6. **Frugality.** Neon wakes up only on an action of the player or a cache older than 6 h. The API of the site is called only on a click on Show more. No call in a loop.
7. **Check before coding.** An assumption that cannot be checked from the terminal (form of the site never captured, missing secret) is not coded: deliver the exact verification path, then stop. Example: one-click posting waits for two readings ([`docs/project/todo.md`](docs/project/todo.md)).
8. **Personal data.** The repository is public. A capture goes through `npm run dom` before the commit. The blacklist of a player lives in Neon, never in the repository.
9. **Versioning.** One task, one branch, one PR, one squash merge. Only the green light ("feu vert") allows the PR and the merge, one PR at a time ([`docs/git/workflow.md`](docs/git/workflow.md#green-light)).
10. **One fact, one place.** Search the term in `docs/` before writing. A list that the code holds is generated in `docs/generated/`.
11. **Anchored facts.** A fact about the code carries a `src: path#anchor` pointer, checked by `npm run check` ([`docs/STYLE.md`](docs/STYLE.md#anchored-facts)).
12. **Context budget.** A page of `docs/` is under 8 KB, this file under 12 KB, a code file under 400 lines. Beyond that, split.
13. **Interface consistency.** Before changing an element of the panel or the popup, look for its twins and propose to align them in the same PR ([`docs/architecture/panel.md`](docs/architecture/panel.md#element-families)).
14. **Writing style.** One fact per sentence, present tense, with the terms of [`docs/vocabulary.md`](docs/vocabulary.md) ([`docs/STYLE.md`](docs/STYLE.md)).
15. **A finding changes the check.** A defect found raises a question: would a test or `npm run check` have caught it? If yes, fix the check in the same change. When a check fails on your own work, fix the work.
    ⚠️ An empty search does not prove an absence. It only says something about the search.

## Critical variables

`secrets.neonUrl` (popup, Neon tab) · `databaseUrlRead` (`scripts/sql.local.json`). Role of each: [`docs/run/getting-started.md`](docs/run/getting-started.md#variables).
