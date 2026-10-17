# Filter rules

> **Answers**: how a rule decides · why a post is hidden · adding a rule · adding a sort.
> **Does not answer**: the list of rules and their thresholds → [`../generated/rules.md`](../generated/rules.md) · the rank table → [`ranks.md`](ranks.md)

A rule receives a post, the active filters and a context. It returns true to hide the post. The engine evaluates every active rule, keeps each reason, and the panel shows them.

## Principles

| Principle | Effect | Source |
| --------- | ------ | ------ |
| hide, never delete | the row stays in the React DOM | [`../architecture/panel.md`](../architecture/panel.md#hiding-dimming-sorting) |
| missing data, nothing hidden | an unreadable field does not hide a post | each `test` checks `!= null` |
| every reason | a post counts in each rule that hides it | `src: extension/src/filters/engine.js#rules.forEach((r) =>` |
| my position is `Any` | the two position rules do not apply | `src: extension/src/filters/rules.js#function myPosition(f)` |

The v1 deleted the rows, and removed a post with an unreadable rank from the table. The v2 hides, and keeps a post with an unreadable rank ([`../project/v1.md`](../project/v1.md)).

## Special cases

- **Blacklist**: an entry without a tag (v1 import) matches every post of that name, whatever the tag. `src: extension/src/filters/rules.js#ctx.blacklistNames.has`
- **Duplicate**: the rule keeps the first post met in the order of the site, the newest one. The posts of Show more come after the ones of the table.
- **Wanted position**: a list truncated by the site (`+`) or an empty list hides nothing. After a Show more, the API completes the list ([`../architecture/site-api.md`](../architecture/site-api.md)).
- **Rank**: the rule hides a duo that is not allowed. An unknown rank hides nothing. An `UNRANKED` player is incompatible with every rank ([`ranks.md`](ranks.md)).
- **Hidden by hand**: the 🙈 button hides a post until the page reloads. Nothing is saved.

## Where the filters live

The active filters belong to the active profile (`player_profile.filters`) and sync with it. Without a profile, they stay in this browser (`db.localFilters`). `src: extension/src/store/model.js#case 'filters.set'`

A rule added after a profile was saved takes its default value. `src: extension/src/filters/engine.js#function mergeFilters(saved)`

## Adding a rule

1. Add an entry to `DuoGG.RULES` (`extension/src/filters/rules.js`): `id`, `label`, `what`, `on`, `test`, and `param` for a threshold.
2. The label and the description show in the panel: write them for a player.
3. Add its test to `tests/rules.test.mjs`, with the missing data case.
4. Run `npm run gen`, then `npm run check` and `npm test`.
5. Change the version (minor): [`../git/workflow.md`](../git/workflow.md#one-version-per-pr).

The panel builds its controls from the registry: no other interface change.

## Adding a sort

Add an entry to `DuoGG.SORTS`: `id`, `label`, `key` (value to compare) and `desc`. Missing values go last. `src: extension/src/filters/engine.js#function order(partners, sortId)`

## Checking

```bash
npm test     # tests/rules.test.mjs: each rule; tests/page.test.mjs: effect on the capture
```
