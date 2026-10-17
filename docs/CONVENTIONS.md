# Documentation conventions

> **Answers**: how to split a page · which size budget · where to write a fact · what goes in `generated/` and `journal/` · what `npm run check` verifies.
> **Does not answer**: how to write a sentence → [`STYLE.md`](STYLE.md) · what to open for a task → [`00-INDEX.md`](00-INDEX.md)

Agents change this project in short sessions, from several tools and several models. Each loaded page takes room in their context. An off-topic page costs tokens, and the agent may follow a nearby section that does not apply.

## Three layers

| Layer | Author | Content |
| ----- | ------ | ------- |
| `docs/generated/` | `scripts/generate.mjs` | what the code already states: rules, selectors, columns, messages. Never written by hand. |
| `docs/` | agents and owner | what the code does not say: why, traps, procedures, meaning for the player |
| `docs/journal/` | append only | dated stories: decisions, incidents, readings. Never rewritten. |

A list that the code holds is generated. `npm run check` fails when a file of `generated/` differs from the output of `npm run gen`.

## One file per task

A file answers one task. "Adding a rule" is a task. "The filters" is a theme, too broad. An agent loads a file to do a job: the file matches that job.

## Budgets

| File | Budget |
| ---- | ------ |
| `docs/**` | 8 KB |
| `docs/00-INDEX.md`, `docs/01-SYMPTOMS.md` | 16 KB |
| `AGENTS.md`, `docs/journal/**` | 12 KB |
| `docs/generated/**` | none: searched, never loaded whole |
| code file | 400 lines |

A file over its budget is split: it now answers two questions.

## One fact, one place

Before writing a fact, search for it: `grep -rn "<term>" docs/`. When it exists, link to it. A link costs about ten tokens. A copy costs hundreds at each load, and becomes wrong at the first change.

| Subject | Owner page |
| ------- | ---------- |
| configuration variables | [`run/getting-started.md`](run/getting-started.md#variables) |
| code constants | [`architecture/config.md`](architecture/config.md) |
| rules, sorts, selectors, columns, messages | `generated/` |
| contract of the API of the site | [`architecture/site-api.md`](architecture/site-api.md) |
| Neon roles and security | [`database/neon.md`](database/neon.md) |
| sync | [`database/sync.md`](database/sync.md) |
| names of the notions | [`vocabulary.md`](vocabulary.md) |

## Facts anchored to the code

A fact about the code carries a `src:` pointer to the file and a literal anchor ([`STYLE.md`](STYLE.md#anchored-facts)). A fact that cannot be anchored is a fact that was not checked: say so, or do not write it.

## Code that looks wrong

A page describes what the code does, even when the behavior looks unintended. The question goes in [`project/todo.md`](project/todo.md), with a link from the page, until a decision is made.

## Routing header

Each file of `docs/` starts with its title, then two lines:

```markdown
> **Answers**: … · …
> **Does not answer**: … → [`path`](path)
```

An agent that opened the wrong file sees it in about a hundred tokens.

## Links to a section

An anchor follows the GitHub rule: lower case, punctuation removed, spaces turned into dashes. Renaming a heading breaks the links to its anchor: `npm run check` reports them.

## Checking

`npm run check` fails on an exceeded budget, a missing header, a dead link or anchor, a missing cited path, a broken `src:` pointer, a style fault, an accented letter, an out-of-date generated file. It warns about a page missing from `00-INDEX.md`. The full list: [`run/tests.md`](run/tests.md#what-npm-run-check-verifies).
