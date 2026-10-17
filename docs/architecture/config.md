# Where a setting goes

> **Answers**: I add a parameter, where does it go · where the connection string lives · what `chrome.storage.local` holds.
> **Does not answer**: setting up a machine → [`../run/getting-started.md`](../run/getting-started.md) · the security of the connection string → [`../database/neon.md`](../database/neon.md)

A setting lives at one of four levels. The level depends on who changes the value, and when.

| Level | Content | Location | Changed |
| ----- | ------- | -------- | ------- |
| code constant | algorithm thresholds, delays, page sizes | `DuoGG.config` (`extension/src/core/config.js`) | with the code, tested |
| registry | filter rules, sorts, DOM selectors | `extension/src/filters/rules.js`, `extension/src/data/selectors.js` | with the code, generated documentation |
| local database | filters, profiles, blacklist, panel position | `chrome.storage.local`, key `db` | at runtime, through the panel or the popup |
| secret | Neon connection string | `chrome.storage.local`, key `secrets`, typed in the popup | at installation |

## Choosing the level

- A threshold that the player tunes while playing becomes a rule parameter (`param` in `DuoGG.RULES`). The panel shows its field without other code.
- A logic threshold that changes only with the algorithm becomes a constant of `DuoGG.config`. A field in the panel would cost a validation, and a bad value would break the behavior without a signal.
- A secret never goes through a content script. Only the service worker and the popup read it.

## Constants of `DuoGG.config`

| Constant | Value | Reason |
| -------- | ----- | ------ |
| `config.observeDebounceMs` | 150 ms | React renders the list in bursts: one recompute per burst. |
| `config.more.maxPagesPerClick` | 4 | At most 200 posts per click on Show more. |
| `config.more.targetVisible` | 20 | Show more stops at 20 new visible posts. |
| `config.more.delayMs` | 400 ms | Delay between two pages of the API of the site. |
| `config.neon.pullTtlMs` | 6 h | Age of the local cache above which opening the site triggers a pull. |
| `config.neon.requestTimeoutMs` | 15 s | Maximum duration of a Neon call. |
| `config.announce.warnLength` | 200 | Note length shown in amber. The limit of the site is unknown. |

`src: extension/src/core/config.js#maxPagesPerClick: 4`

## No local configuration file

The extension reads no git-ignored file. The connection string is typed once per Chrome profile, in the popup. `src: extension/src/store/worker.js#(r.secrets && r.secrets.neonUrl)`

⚠️ The service worker loads only versioned files. `importScripts` on a missing file fails at registration, and Chrome lists the failure in the errors of the extension, even inside a `try`. `npm run check` refuses such a path ([`../journal/2026-10-17-missing-config-file.md`](../journal/2026-10-17-missing-config-file.md)).

## Shape of the local database

The `db` key holds the whole non-secret state, in one object. Its shape and its operations are in `extension/src/store/model.js` (`emptyDb`). The list of operations is generated: [`../generated/operations.md`](../generated/operations.md).

⚠️ Changing the shape of `db` requires incrementing `db.v` and writing the migration in `readDb()` of the service worker. Without it, an existing browser starts again from an empty database.
