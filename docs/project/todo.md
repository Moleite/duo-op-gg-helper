# Next tasks and limitations

> **Answers**: what the next task is · what waits for a check · which limitations are accepted.
> **Does not answer**: the history of the decisions → [`../journal/2026-10-17-v2-rewrite.md`](../journal/2026-10-17-v2-rewrite.md)

## One-click posting

Today, the Post tab builds the note, copies it and opens the form of the site. Automatic posting waits for two readings that only the owner of the account can make.

1. Capture of the form. On the page of the site, with the extension disabled, click Post & find Duo. In the console: `copy(document.documentElement.outerHTML)`. Paste into `DOM/raw-2.0_POST-FORM.html`, then run `npm run dom`.
2. Reading of a real post. DevTools, Network tab, filter `graphql`. Publish a post by hand. In the `AddPartner` request:
   - Payload tab: copy `variables`, with name and note replaced;
   - Headers tab: note whether an `authorization` header exists, without copying its value.

These readings decide between two paths, to choose with them:

| Path | Advantage | Risk |
| ---- | --------- | ---- |
| fill the form of the site, then submit it | same validation and same authentication as the site | depends on the DOM of the form |
| call `AddPartner` from the content script | independent from the form | authentication and `options` to reproduce |

## Open checks

- Update notice: with the extension loaded, raise the version in `extension/manifest.json` without a reload, then open the popup. Expected: `Version X available: reload the extension (chrome://extensions, ↻), then F5 on the page of the site.` The popup reads the file itself, like BotEd_MDF. The panel asks the service worker, which reads the same file: open the site too.
- Move of a 2.0.2 connection string, on a real Chrome profile: after the reload, the Neon tab of the popup shows the role without a new paste. In the DevTools of the service worker, Application tab, the IndexedDB `duogg-secrets` holds `neonUrl`, and `await chrome.storage.local.get()` has no `secrets` key.
- Rank table: compare it with the game client, Master and above first ([`../filters/ranks.md`](../filters/ranks.md#reliability)).
- Verified only filter: its state is not read, so Show more does not send `isAuth`. It needs a capture with the filter on (`DOM/raw-1.1_FIND-DUO-VERIFIED.html`).
- Maximum length of a note: unknown. The panel warns above `config.announce.warnLength` (200).
- Meaning of the `options` field of the API (`0`, `1`, `1024`, `1025`): a Verified badge matches `1024` on the post read, a single case.

## Ideas

- Blacklist shared between players: a `shared` column and an RLS read policy for the group. Decision of the owner.
- Champion rule: hide a player according to their recent champions.
- History of the players already contacted, with a note.
- Saving the posts hidden by hand beyond a reload.

## Accepted limitations

- The rank rule applies whatever the queue. The restrictions of Riot apply to Solo/Duo only.
- The rows of Show more have a simplified layout, without avatar and without champion tooltip.
- A post hidden by hand comes back when the page reloads.
- Changing a native filter of the site empties the posts of Show more: they no longer match the new filters.

## Owner actions

- Protect `main` in the GitHub settings: PR required, green CI.
