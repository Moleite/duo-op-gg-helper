# Vocabulary

> **Answers**: which term to use for a notion of the project · what a term means.
> **Does not answer**: how to write a sentence → [`STYLE.md`](STYLE.md) · the columns → [`generated/schema.md`](generated/schema.md)

Each notion has one name in the documentation, in the comments and in the interface.

## Extension

| Term | Definition | Avoid |
| ---- | ---------- | ----- |
| panel | What the extension puts on the page of the site (`#duogg-root`). | pop-in, dashboard, overlay |
| popup | Window of the extension, opened from the Chrome toolbar (`popup.html`). | menu, options |
| service worker | `background.js`: only writer of the storage, only Neon client. | background, worker alone |
| page of the site | Tab open on duo.op.gg, where the content script runs. | site, tab alone |
| row action bar | ⛔ and 🙈 buttons that follow the hovered row (`#duogg-tools`). | toolbar |
| recompute | One run of `recompute()`: rules, attributes, panel. | refresh, render |
| update notice | Amber banner of the panel or the popup: reload the extension, or F5 on the page of the site. | update popup |

## Posts

| Term | Definition | Avoid |
| ---- | ---------- | ----- |
| post | A duo search published on the site. `Partner` object in the code, same shape for the DOM and the API. | partner in prose, ad |
| site table | The 50 posts that the site shows. | list, grid |
| older posts | Posts loaded by Show more, under the table (`#duogg-more`). | extended results |
| hide | Hide a post without removing it from the DOM (`data-duogg="hidden"`). | delete, remove |
| dim | Show a hidden post faded, with its reasons (`dim`). | |
| rule | One entry of `DuoGG.RULES`: a test that hides. | filter, for a single rule |
| filters | All the settings of the panel: my position, my rank, rules, sort. | |
| reason | Id of a rule that hides a post. | cause |
| wanted position | Position that the author of a post looks for (`requiredPosition`). | looking for in prose |
| capture | HTML file of `DOM/`, pseudonymized copy of a screen of the site. | dump, snapshot |

## Data

| Term | Definition | Avoid |
| ---- | ---------- | ----- |
| profile | One LoL account of a player: Riot ID, positions, champions, filters (`player_profile`). | user |
| player | A person who uses the extension, with their Neon login role. | user |
| blacklist | Players to avoid, owned by one player (`blacklist_entry`). | ban list |
| local database | The `db` key of `chrome.storage.local`. | cache, storage |
| row to push | Row marked in `db.dirty`, waiting for a sync. | queue |
| sync | One Neon round trip: push of the marked rows, then a read. | |
| green light | The words "feu vert" or "green light", which allow the PR and the merge ([`git/workflow.md`](git/workflow.md#green-light)). | go, ok |
