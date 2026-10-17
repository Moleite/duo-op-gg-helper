# Panel and popup

> **Answers**: which elements of the panel and the popup look alike · the pattern of a secret field, a status, a rule · how to hide without breaking React.
> **Does not answer**: what each rule does → [`../filters/rules.md`](../filters/rules.md) · where to store a setting → [`config.md`](config.md)

The panel is what the extension puts on the page of the site. The popup is the window of the extension, opened from the Chrome toolbar. The panel is for playing, the popup is for setting up.

## What goes where

| Element | Panel | Popup | Reason |
| ------- | ----- | ----- | ------ |
| filters, sorting, Show more | yes | | used while playing |
| adding to the blacklist | yes (⛔ button of a row) | | from the post |
| blacklist list and removal | yes | counter | |
| import of the v1 blacklist | | yes | once |
| profiles | selection | creation, editing | long form |
| Neon connection string | | yes | never on the page of the site |

## Isolation of the panel

The panel and the row action bar each live in a closed shadow root. The scripts of the site and its session recorders do not walk their content. The CSS of the site does not apply to them. `src: extension/src/ui/panel.js#attachShadow({ mode: 'closed' })`

No text from the site goes through `innerHTML`. The notes and names of other players are untrusted data. `extension/src/ui/dom.js` builds each element with `textContent`, and `npm run check` refuses `innerHTML` in `extension/`.

## Hiding, dimming, sorting

| Effect | Mechanism |
| ------ | --------- |
| hide | `data-duogg="hidden"` on the row, `display:none` from `PAGE_CSS` |
| dim | `data-duogg="dim"`, reduced opacity, reasons in `data-duogg-why` shown by `::after` |
| sort | `order` property on each row, list turned into `flex` |

The rows stay in the DOM, in the order of React. `src: extension/src/ui/rows.js#function apply(doc, result, order, showHidden)`

## Element families

| Family | Elements | Pattern |
| ------ | -------- | ------- |
| rule | one line per entry of `DuoGG.RULES`: checkbox, label, threshold, counter | `panel-filters.js`, built from the registry |
| counter | number of posts hidden by a rule | `.count`, red (`.hit`) when the rule hides posts |
| status message | under a button or a card | `.hint` neutral, `.hint.ok` green, `.hint.warn` amber, `.hint.err` red |
| secret field | Neon connection string | `popup-neon.js` |
| row action | ⛔ blacklist, 🙈 hide | bar on hover (`rows.mountTools`), buttons of the `#duogg-more` rows |

## Secret field

| State | Placeholder | Status |
| ----- | ----------- | ------ |
| empty | `postgresql://duogg_player:...@ep-...neon.tech/neondb` | `No connection string saved` |
| saved | `Saved (leave empty to keep it)` | `Connection string saved (role@host/database)` (green) |
| refused | unchanged | red message from the service worker |

The field never shows the value again. The status says that a value exists. The Sync button says whether it works: `Connected as <role> on <database>`.

## Consistency

Before changing an element, look for its twins in this table and propose to align them in the same PR. A new element reuses an existing pattern. When none exists, the new pattern is described here.

## Checking

`tests/page.test.mjs` and `tests/popup.test.mjs` load the panel and the popup in Node. They see neither the CSS nor the layout: reopening the page in Chrome stays necessary for these two points.
