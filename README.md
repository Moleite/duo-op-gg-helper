# duo-op-gg-helper

Chrome extension (MV3) that improves the duo table of [duo.op.gg](https://duo.op.gg/en/lol/) to find the best duo partner. The code is plain JS, without a build and without a runtime dependency.

## Features

- **Panel on the page**: filters, sorting, blacklist and post note, without leaving the table. It can be moved and collapsed.
- **Hide instead of delete**: a filtered post is hidden or dimmed, with its reasons. The Dim instead of hiding option brings it back.
- **Rules**: blacklist, duplicates, same position, wanted position, incompatible rank, minimum win rate, minimum games, post too old. One counter per rule. List: [`docs/generated/rules.md`](docs/generated/rules.md).
- **Sorting**: win rate, OpScore, KDA, games, newest.
- **Show more**: loads older posts through the API of the site, beyond the 50 of the table, until 20 new visible posts per click.
- **Blacklist**: ⛔ button on each row, reason and private note. Import of the `blacklist.txt` of the v1.
- **Profiles**: one per LoL account. The profile of the signed-in op.gg account becomes active on its own. The post note is built from the profile.
- **Neon (optional)**: profiles, filters and blacklist synced between browsers. Each player has their own role and sees only their data.

One-click posting is prepared: the Post tab builds the note, copies it and opens the form of the site. Automatic posting waits for a reading of the form ([`docs/project/todo.md`](docs/project/todo.md)).

## Installing

1. Clone the repository.
2. `chrome://extensions`, Developer mode, Load unpacked: the `extension/` folder.
3. Open duo.op.gg.

Configuration, Neon and troubleshooting: [`docs/run/getting-started.md`](docs/run/getting-started.md).

## Developing

```bash
npm run setup     # .env from .env.example (local secrets), then npm ci (linkedom, PGlite, fake-indexeddb)
npm test          # rules, extraction replayed on the captures, SQL and RLS, page, popup
npm run check     # documentation, style, generated files, code, captures
```

## Documentation

The documentation loads in pieces: one file per task, 8 KB at most, with an *Answers / Does not answer* header.

| Entry | Content |
| ----- | ------- |
| [AGENTS.md](AGENTS.md) | entry point for AI agents: protocol, routing, rules |
| [docs/00-INDEX.md](docs/00-INDEX.md) | index by need |
| [docs/01-SYMPTOMS.md](docs/01-SYMPTOMS.md) | troubleshooting by symptom |
| [docs/architecture/overview.md](docs/architecture/overview.md) | the framework: contexts, modules, cycle |
| [docs/generated/](docs/00-INDEX.md#facts-generated-from-the-code) | lists taken from the code |

## Version 1

The v1 is on the `v1.0` tag. What it did and what it became: [`docs/project/v1.md`](docs/project/v1.md).
