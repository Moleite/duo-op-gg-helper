# Writing style

> **Answers**: how to write a sentence · name a heading · structure a page · write a code comment · what `npm run check` reports.
> **Does not answer**: splitting or sizing a page → [`CONVENTIONS.md`](CONVENTIONS.md) · the meaning of the terms → [`vocabulary.md`](vocabulary.md)

This documentation is a working documentation. A reader opens it to find a fact, a rule or a procedure. These rules apply to `docs/`, `AGENTS.md`, the `README.md`, code comments, commits, PRs and the task report.

## Language

Write everything in English: documentation, code comments, displayed texts, SQL, commits, PRs. The code, the site and its API use English, and the documentation must use the exact identifiers of the code (`requiredPosition`, `player_key`). `npm run check` refuses an accented letter. The conversation with the owner can be in another language: the repository stays in English.

## Sentences

1. One fact per sentence. Aim for 25 words, 40 at most.
2. Subject first, verb early: "`rows.js` sets the attributes."
3. Present tense and active voice: "the service worker writes the local database".
4. Name the actor instead of a vague "it" or "we".
5. Write a procedure in the imperative: "Run `npm test`."
6. One term for one thing, taken from [`vocabulary.md`](vocabulary.md) or from the code.
7. An identifier stays exact and in inline code: `config.more.targetVisible`, `data-duogg`.

## Headings

- The H1 names the subject: `# Filter rules`.
- A section heading says what the section holds: `The from cursor`, `One sync, one round trip`.
- No slogan, no question, no pun.

## Structure of a page

After the routing header, one to three sentences sum up the subject. A section with nothing to say is left out.

| Type | Examples | Content, in order |
| ---- | -------- | ----------------- |
| mechanism | `architecture/`, `database/`, `filters/` | how it works, one section per rule, `Checking` |
| procedure | `run/`, `git/` | prerequisites, numbered steps, special cases |
| reference | `generated/` | the generated table |
| troubleshooting | `01-SYMPTOMS.md` | one `Symptom / Cause / Fix` table per area |
| journal | `journal/` | request or symptom, decisions or cause, fix |

A table or a list is required from three items on.

## Anchored facts

A sentence that describes the code ends, when useful, with a pointer to the code that makes it true:

```markdown
The service worker refuses a secret from a tab. `src: extension/src/store/worker.js#function fromTab(sender)`
```

`npm run check` fails when the file or the anchor no longer exists. A rename in the code then becomes a documentation task, instead of a wrong page.

## Warnings

A warning is a paragraph that starts with `⚠️`. It states the risk, then the action. The history of a change goes in `journal/`.

## Forbidden patterns

| Pattern | Write instead |
| ------- | ------------- |
| em dash (—) to chain clauses | two sentences, or a colon |
| "it is not X, it is Y" | the fact: "Y" |
| fillers: very, really, just, simply (list `FILLERS`) | remove the word |
| emphasis: **never**, CAPITALS | plain text; bold marks a defined term |
| rhetorical question | the answer |
| a count typed by hand ("the 50 rows") | the source and the command that checks it |
| metaphor, personification | the literal term |

## Code

- The header of a code file gives its name and role, then `Exposes:`, then the constraints.
- A comment gives a reason that the code does not show, and links the documentation instead of copying it.
- Displayed texts are written for a player: short, concrete, without internal terms.

## What `npm run check` reports

In the prose of the documentation: em dash, double dash between two words, a word of `FILLERS`, a capitalized word missing from `ACRONYMS`, a sentence longer than 40 words. Both lists are in `scripts/style.mjs`. In every file: an accented letter. This page is not style-checked: it quotes the patterns on purpose.
