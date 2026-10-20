# Getting started

> **Answers**: installing the extension · reloading it after a change · setting up Neon · preparing a development machine.
> **Does not answer**: creating the database → [`../database/neon.md`](../database/neon.md) · running the tests → [`tests.md`](tests.md)

## Loading the extension

1. Clone the repository: `git clone https://github.com/Moleite/duo-op-gg-helper`.
2. Open `chrome://extensions` and turn on Developer mode.
3. Load unpacked: pick the `extension/` folder, not the root of the repository.
4. Open [duo.op.gg](https://duo.op.gg/en/lol/): the DuoGG panel appears at the top right of the table.

⚠️ Chrome runs the working folder. The active branch is the code that runs as soon as the extension reloads. Go back to `main` before playing with a merged version.

## Reloading after a change

| Changed file | Action |
| ------------ | ------ |
| `extension/src/**`, `extension/manifest.json` | ↻ on the card of the extension, then F5 on the page of the site |
| `extension/popup.*` | close and reopen the popup |
| `extension/background.js`, `extension/src/store/worker.js` | ↻ on the card of the extension |

The version of the loaded code shows at the bottom of the panel (`v2.0.0`) and at the top of the popup.

## First use

1. Popup, Profiles tab: create a profile (Riot ID, op.gg account, positions, champions, rank).
2. Popup, Blacklist tab: paste the old `blacklist.txt` of the v1, then click Import.
3. Panel, Filters tab: set my position, my rank and the rules.

The op.gg account of the profile is the name shown at the top right of duo.op.gg. When the site opens, the profile that carries this name becomes active.

## Setting up Neon

Without Neon, everything stays in this browser. To share the profiles and the blacklist between several browsers:

1. Get your connection string ([`../database/neon.md`](../database/neon.md)).
2. Popup, Neon tab: paste the string, click Save, then Sync.
3. Check the message `Connected as duogg_<player> on neondb`.

Each Chrome profile keeps its own connection string: paste it once per profile.

## Variables

All local secrets live in one file, `.env` at the root of the repository. `npm run setup` creates it from `.env.example`, and git ignores it. `src: scripts/setup.mjs#copyFileSync`

| Variable | Role | Reader |
| -------- | ---- | ------ |
| `DUOGG_NEON_URL` | connection string of your player role (group `duogg-user`) | nobody: paste it in the popup, Neon tab, in each browser |
| `DUOGG_NEON_URL_READ` | read-only connection string (role `duogg_agent`, group `duogg-read`) | `scripts/sql.mjs` ([`../database/sql-cli.md`](../database/sql-cli.md)) |

The extension reads no file outside `extension/`, and no git-ignored file: the service worker keeps the player string in the IndexedDB of the extension ([`../database/neon.md`](../database/neon.md#where-the-connection-string-lives)). `npm run check` verifies that this table lists the keys of `.env.example`.

## Development machine

```bash
npm run setup     # .env from .env.example, then npm ci (linkedom, PGlite and fake-indexeddb, for the tests only)
npm test
npm run check
gh auth login     # Git and gh use the credential manager of the system
```

Node 20 or later. The extension itself needs neither Node nor the dependencies.
