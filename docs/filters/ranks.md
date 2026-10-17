# Duo rank compatibility

> **Answers**: which ranks can play together according to the extension · where the table comes from · how to change it.
> **Does not answer**: how the rule hides → [`rules.md`](rules.md)

The `rank` rule hides a player with whom a Solo/Duo duo is not allowed. The table comes from the v1 (tag `v1.0`). It lives in `lol.duoCompatible()`. `src: extension/src/core/lol.js#function duoCompatible(me, other)`

## Table

| My rank | Compatible ranks |
| ------- | ---------------- |
| Iron, Bronze | Iron, Bronze, Silver |
| Silver | Iron, Bronze, Silver, Gold |
| Gold | Silver, Gold, Platinum |
| Platinum | Gold, Platinum, Emerald |
| Emerald | Platinum, Emerald, Diamond within two divisions |
| Diamond 1 | Diamond 1 to 3, Master, Grandmaster, Challenger |
| Diamond 2 to 4 | Emerald and Diamond within two divisions |
| Master, Grandmaster, Challenger | Diamond 1, Master, Grandmaster, Challenger |
| Unranked | none |

"Within two divisions" is counted on the continuous ladder of `lol.rankIndex()`: Emerald 1 and Diamond 3 are two divisions apart. `src: extension/src/core/lol.js#function rankIndex(r)`

## Properties

- The relation is symmetric. `tests/lol.test.mjs` checks it on every pair of ranks.
- An unknown rank gives `null`: the rule hides nothing.
- A tier without a division (`Emerald`) takes its division 4.

## Reliability

⚠️ The table was not compared with the rules of Riot. Riot changed the rules at the top of the ladder in 2026, and published guides disagree about Master and above. The in-game check is listed in [`../project/todo.md`](../project/todo.md).

The table applies whatever the queue. The rank restrictions of Riot apply to Solo/Duo only. Disable the rule for another queue.

## Changing the table

1. Observe the rule in the game client: invite a player of each neighbor rank, and note the refusals.
2. Change `duoCompatible()` and the boundary cases of `tests/lol.test.mjs`.
3. Keep the relation symmetric: the test of every pair fails otherwise.
4. Write the dated finding in `docs/journal/`, with its date and its source.
