# Troubleshooting by symptom

> **Answers**: something does not work, where to start · a displayed message, its cause, its fix.
> **Does not answer**: how the system works → [`00-INDEX.md`](00-INDEX.md)

Look for the symptom or the exact message. The most frequent case comes first in each area.

## Extension and panel

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| the panel does not appear | extension not reloaded, or loaded folder = root of the repository | load the `extension/` folder, ↻, then F5 on the page of the site |
| the panel does not appear, the table is empty | no post shown: the panel hides without posts | change a native filter of the site |
| a code change has no effect | Chrome runs the working folder of the last reload | ↻ on the card of the extension, F5, compare the version at the bottom of the panel |
| `Extension reloaded: reload the page (F5).` | the extension was reloaded under an open page | F5 on the page of the site |
| `Service worker unreachable: …` in the popup | error while loading `background.js` | `chrome://extensions`, Service worker link, read the console |
| posts with empty fields stay visible while a filter is set | unreadable data: the rule does not hide without data | [`filters/rules.md`](filters/rules.md#principles) |
| sorting changes nothing | sort `Site order` selected | pick another sort in the Filters tab |
| every field of a row is empty or wrong | the site changed its DOM | [`architecture/dom-selectors.md`](architecture/dom-selectors.md#the-site-changed) |

## Show more

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `duo.op.gg API: HTTP 4xx` or `5xx` | the API of the site refuses or is down | try again later. When the error lasts, read the contract again ([`architecture/site-api.md`](architecture/site-api.md)) |
| `duo.op.gg API: <message>` | GraphQL error: the contract changed | read the request of the site in DevTools, compare it with `PARTNERS_QUERY` |
| `End of the site list.` | no older post left | none |
| the loaded posts disappear | a native filter of the site changed | run Show more again: the old pages no longer matched |
| Show more includes accounts that are not verified | the state of Verified only is not read | known limitation ([`project/todo.md`](project/todo.md#open-checks)) |

## Neon and sync

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `No Neon connection string saved.` | missing secret | popup, Neon tab |
| `Unreadable connection string: …` | format other than `postgresql://role:password@host/database` | copy the string again from Connect |
| `Connected as neondb_owner` | string of the owner of the database | create a player role ([`database/neon.md`](database/neon.md#creating-the-database)) |
| `Neon 400: password authentication failed …` | wrong password or missing role | run `db/create-role.sql` again, paste the string again |
| `Neon 400: permission denied for table …` | `db/grants.sql` not run, or role outside the `duogg-user` group | run `db/grants.sql`, check the group |
| `Neon 400: column "…" does not exist` | migration not run | run the files of `db/migrations/` in order |
| `Neon: no response within 15 s` | suspended database or network | click Sync again: the rows stay to push |
| another browser does not see a change | no sync yet, or last pull less than 6 h old | click Sync in the popup |
| `⚠ Neon: …` at the bottom of the panel | last sync failed | read the message, then this table |

## Tests and checks

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `docs/generated/…: out of date: run npm run gen` | registry or schema changed without generating again | `npm run gen` |
| `src: missing anchor …` | the cited code was renamed | fix the pointer or the sentence |
| `accented letter: write in English` | text written in another language | translate the line |
| `… op.gg link(s) not pseudonymized` | raw capture copied without `npm run dom` | [`architecture/dom-captures.md`](architecture/dom-captures.md) |
| `npm test` never ends | a write of the extension restarts the observer | [`architecture/overview.md`](architecture/overview.md#recompute-cycle) |
| `Cannot find package 'linkedom'` | missing test dependencies | `npm ci` |
