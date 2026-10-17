# GraphQL API of the site

> **Answers**: how Show more gets the next posts · the `from` cursor · the values of the variables · what is still unknown about posting.
> **Does not answer**: reading a DOM row → [`dom-selectors.md`](dom-selectors.md) · what is left to check → [`../project/todo.md`](../project/todo.md)

The site shows 50 posts and does not paginate: no button, no infinite scroll. Its data comes from a GraphQL API, `https://duo.op.gg/graphql`. The extension calls it read-only, on a click on Show more. The contract below was read on 2026-10-17 in the bundle of the site and with read-only calls ([`../journal/2026-10-17-v2-rewrite.md`](../journal/2026-10-17-v2-rewrite.md)).

## The `partners` query

```graphql
query partners($tier: String, $region: String, $position: String,
               $queueType: String, $isAuth: Boolean, $from: Int) {
  partners(tier: $tier, region: $region, position: $position,
           isAuth: $isAuth, queueType: $queueType, from: $from) { ...CorePartner }
}
```

The extension asks for a subset of the fields of `CorePartner`. `src: extension/src/data/api.js#PARTNERS_QUERY`

| Variable | Values seen | Trap |
| -------- | ----------- | ---- |
| `region` | `euw`, value of the native selector | |
| `tier` | `ALL`, `IRON`… `CHALLENGER`, `UNRANKED` | null returns an empty list |
| `position` | `ALL`, `TOP`, `JUNGLE`, `MID`, `BOTTOM`, `SUPPORT` | null returns an empty list |
| `queueType` | `RANKED_SOLO`, `RANKED_FLEX`, `NORMAL`, `ARAM`… | |
| `from` | absent, then a cursor | `from: 0` returns an empty list as soon as a filter is active, an offset (50, 100) too |

## The `from` cursor

The first page is requested without `from`. It matches the table of the site, native filters included. `src: extension/src/data/api.js#if (from) v.from = from`

`from` is then the Unix timestamp, in seconds, of the oldest post received. Each page holds 50 posts at most, all older than the cursor. `src: extension/src/data/api.js#function cursorOf(partners)`

Show more stops on an empty page, or on a cursor that no longer moves back. `src: extension/src/app.js#next >= st.cursor`

## Field formats

| Field | Format | Reading |
| ----- | ------ | ------- |
| `insertedAt` | ISO (`2026-10-17T13:44:47.315Z`) or Date text (`Fri Oct 16 2026 08:09:36 GMT+0900 (Korean Standard Time)`) | `Date.parse` reads both |
| `requiredPosition` | array, `["ALL"]`, or null | null gives an empty list: the rule hides nothing |
| `summoner.tier` | `Emerald 2`, `Master 1`, `Unranked` | `lol.parseRank` |
| `summoner.champions[].wr` | text `53%` | number |
| `options` | integer (`0`, `1`, `1024`, `1025`) | meaning unknown, not read |

`src: extension/src/data/api.js#function parseDate(s)`

## Call from the content script

The content script calls the API from the origin of the site, with `credentials: 'include'`. The cookies of the site are sent, no secret of the extension is. Reading works without an authentication header. `src: extension/src/data/api.js#credentials: 'include'`

## Posting

The bundle of the site publishes a post with the `AddPartner` mutation. Its variables: `note`, `passcode`, `position`, `position2`, `champion`, `champion2`, `requiredPosition`, `region`, `summonerName`, `gameName`, `tagLine`, `queueType`, `options`.

The extension does not call this mutation. Three points are unknown: the authentication mode, the meaning of `options` and the expected value of `summonerName`. The verification path is in [`../project/todo.md`](../project/todo.md).

## Checking

`tests/api.test.mjs` replays a post read on the API, the cursor and both date formats. A change of the API shows in Chrome: Show more then displays `duo.op.gg API: …` under the button.
