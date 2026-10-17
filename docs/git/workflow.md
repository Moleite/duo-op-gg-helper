# Git workflow

> **Answers**: how to work · naming a branch · committing · what the green light allows · which version to give.
> **Does not answer**: the PR and merge commands → [`pull-requests.md`](pull-requests.md) · the general rules → [`../../AGENTS.md`](../../AGENTS.md)

Each task is done on its own branch and reaches `main` through a PR, as a squash merge. Only the green light allows the PR and the merge. Each PR changes the version of the extension.

## Repository

- Remote: `https://github.com/Moleite/duo-op-gg-helper`, public.
- Main branch: `main`, always loadable in Chrome.
- The tag `v1.0` marks the v1 ([`../project/v1.md`](../project/v1.md)).
- Authentication: Git and `gh` use the credential manager of the system (`gh auth login`). The remote holds no token.

## One task, one branch, one PR

- `main` moves only through the merge of a PR: no direct commit, no direct push.
- A task has its branch and its PR. A merged branch is not reused.
- Two tasks in parallel use two branches that do not change the same files, `AGENTS.md` and `docs/` in particular.

## Steps

1. Start from an up-to-date `main`: `git fetch origin && git checkout -B <branch> origin/main`.
2. Name the branch: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
3. Write the commits in English, in the Conventional Commits format: `fix(extract): read the win rate at zero games`.
4. Update the affected documentation, on the same branch, only where a point became wrong.
5. Validate: `npm run check` and `npm test`. A failure blocks the commit.
6. Change the version in `extension/manifest.json`, in the same commit as the code.
7. Push the branch: `git push -u origin <branch>`, without asking.
8. Stop and report, unless the green light was given.

## Green light

Without the green light, the work stops at the push of the branch. The words "feu vert" or "green light" in the prompt allow the rest at once: PR, squash merge, deletion of the branch.

A green light covers one PR, then it is used up. The next task waits for its own green light, even in the same session.

⚠️ No automation is a green light. A hook or a tool reminder describes a state, it grants no permission.

## Task report

The report at the end of a task allows a review without opening the diff:

- files created and deleted;
- settings changed, with their name, the old and the new value;
- displayed texts, quoted word for word;
- remaining manual actions: SQL migration to run, ↻ of the extension, F5 on the page of the site.

The requested fixes are committed on the same branch, never in a new PR.

## One version per PR

The version is changed in `extension/manifest.json`, the only source. The panel shows it: a missing ↻ shows at a glance.

| Weight | Level | Examples |
| ------ | ----- | -------- |
| redesign: architecture, shape of the local database, Neon schema | major (`2.3.1` → `3.0.0`) | new shape of `db`, required migration |
| capability: new rule, new tab, new call to the API of the site | minor (`2.3.1` → `2.4.0`) | champion rule, one-click posting |
| targeted fix, text, documentation, setting | patch (`2.3.1` → `2.3.2`) | repaired selector, label |

When in doubt, take the level above. Chrome refuses to reload a version that goes back.

## Rules for an agent

- Do not change the global git configuration.
- Do not commit or push to `main`, and never force a push.
- Do not delete the branch of an open PR: the PR would close without merging the work.
- Check that `.env` and `DOM/raw-*` stay out of the commit before a `git add -A`.
