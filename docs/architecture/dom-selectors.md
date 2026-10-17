# DOM selectors of the site

> **Answers**: how a row of the table becomes a post · which traps the DOM of the site holds · what to do when the site changes.
> **Does not answer**: the list of selectors → [`../generated/selectors.md`](../generated/selectors.md) · adding a capture → [`dom-captures.md`](dom-captures.md)

The site is a React application (Next.js, Tailwind, MUI). Tailwind classes describe the layout and change with each redesign. The selectors prefer ids, aria attributes and texts. They all live in `extension/src/data/selectors.js`, and their table is generated.

## Identifying a row

Each `li.MuiCollapse-root` row holds a `div#partner-<id>` block. This id is the id of the post in the API. `extract.rowOf(id)` finds the row of a post by this id. `src: extension/src/data/extract.js#function rowOf(id, root)`

## Known traps

| Trap | Consequence | Handling |
| ---- | ----------- | -------- |
| The Looking for cell shows two icons at most, then `+` | the list of wanted positions is incomplete | `lookingForPartial` is true: the rule does not hide, the API completes the list |
| A Looking for cell can be empty | no known wanted position | empty list: the rule does not hide |
| `div.w-16` matches the OpScore cell and the position cell | wrong value read | selector `div.w-16.text-3xs` |
| Champions show their own percentage | the win rate read would be the one of a champion | the overall win rate is read in the `div.w-38` cell, next to the `W` and `L` spans |
| A player with zero games shows `0W`, `0L` and `0%` | a win rate of 0 would hide the player | win rate null |
| The `title` of the Posted cell is a 12-hour time without AM or PM | ambiguous time | the age is read in the text (`3 hrs ago`) |
| Two blocks carry the id `partner-<id>-edit-position` | `getElementById` returns only one | the positions are read by class, inside the row |

`src: extension/src/data/extract.js#0W 0L`

## Data the DOM does not give

- The full list of wanted positions beyond two: the API gives it.
- The exact time of the post: the API gives `insertedAt`.
- The meaning of the `Verified` badge in the API: it is read in the DOM only (`img[alt="Verified"]`).

## The site changed

1. Capture the affected screen ([`dom-captures.md`](dom-captures.md)).
2. Run `npm test`. `tests/extract.test.mjs` replays each capture and names the unreadable field and the id of the row.
3. Fix the selector in `extension/src/data/selectors.js`, its description included.
4. Run `npm run gen`, then `npm run check`.
5. Change the version (patch): [`../git/workflow.md`](../git/workflow.md#one-version-per-pr).

⚠️ An empty search in a capture does not prove an absence. Tailwind classes contain brackets and colons (`w-[66px]`, `sm:whitespace-nowrap`): a badly escaped `grep` pattern finds nothing. Also search by text.
