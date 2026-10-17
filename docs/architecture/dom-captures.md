# Adding a capture to `DOM/`

> **Answers**: capturing a screen of the site · naming the capture · lightening and pseudonymizing it · what CI checks.
> **Does not answer**: which selectors the extension uses → [`dom-selectors.md`](dom-selectors.md)

The captures of `DOM/` are the only reference for the selectors: the site has no documentation and no public API. The repository keeps lightened and pseudonymized captures. A raw capture is never committed.

## Capturing a screen

1. On the page of the site, disable the extension, or reload the page without it. Otherwise, the capture holds the panel and the `data-duogg` attributes.
2. In the console: `copy(document.documentElement.outerHTML)`.
3. Paste the text into `DOM/raw-<number>_<SCREEN>.html`. The `raw-` prefix is git-ignored.
4. Run `npm run dom`. The script writes `DOM/<number>_<SCREEN>.html`, lightened and pseudonymized.
5. Run `npm test`, then commit the clean capture.

## What the script removes

| Removed | Reason |
| ------- | ------ |
| `<script>`, `<noscript>`, `<iframe>` | code of the site and trackers, never read |
| `d="…"` attributes longer than 120 characters | icon geometry |
| content of `data:…;base64` URIs | embedded images |

The rest does not change: structure, classes, ids, aria attributes, texts, `<style>`. `src: scripts/clean-dom.mjs#export function lighten(html)`

## Pseudonymization

The repository is public. A capture holds the posts of other players and the signed-in op.gg account.

| Data | Replaced with |
| ---- | ------------- |
| Riot ID (name, tag, op.gg link) | `Player01#0001`, numbered per identity |
| note of the post | `Anonymized note 01` |
| IP fragment under the age | `0.1`, `0.2`… |
| signed-in op.gg account, everywhere in the page | `MyAccount` |

An identity is the pair of name and tag. Two posts of the same player keep the same identity, so the duplicate rule stays testable. `src: scripts/clean-dom.mjs#const key = name + '#' + tags[i]`

The script refuses to write a capture where an original name still appears, for example in an `alt` attribute. `src: scripts/clean-dom.mjs#output refused`

## Naming

`<family>.<variant>_<SCREEN>.html`

| Family | Screens |
| ------ | ------- |
| `1.x` | post table (`1.0_FIND-DUO`) and its filter variants |
| `2.x` | Post & find Duo form |
| `3.x` | other pages of the site (account, clans) |

Two captures of the same screen stay useful when they show the code different cases: an active native filter, Verified only, an empty list.

## Checking

```bash
npm run dom -- --check   # no raw capture, no real name (also in npm run check)
npm test                 # tests/extract.test.mjs replays each FIND-DUO capture
```
