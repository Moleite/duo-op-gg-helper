# 2026-10-17: error on the missing config.local.js

> **Answers**: why the extension no longer reads a local configuration file · what the error looked like.
> **Does not answer**: where a setting goes today → [`../architecture/config.md`](../architecture/config.md)

Dated story: it is never rewritten. A fact that becomes wrong is corrected in a new file.

## Symptom

Right after the first install of v2.0.0, `chrome://extensions` showed one error on the extension: `An unknown error occurred when fetching the script.`, context unknown, stack `:0 (anonymous function)`.

## Cause

`background.js` loaded the optional, git-ignored file `config.local.js` with `importScripts` inside a `try`. On a fresh clone, the file does not exist. The `try` kept the service worker alive, but Chrome still listed the failed fetch in the errors of the extension.

The tests did not see it: `tests/helpers/ext.mjs` loads only the `src/` files of `background.js`, and `npm run check` checked only those paths.

## Fix

- The local configuration file is removed. The connection string is typed in the popup, once per Chrome profile.
- `npm run check` now checks every `importScripts` path of `background.js`: it must exist in the repository and must not be git-ignored.
- Version 2.0.1.
