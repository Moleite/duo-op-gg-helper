# Opening a PR, merging, cleaning up

> **Answers**: the concrete commands to open a PR, merge it and clean up.
> **Does not answer**: when and why → [`workflow.md`](workflow.md)

⚠️ No command of this page runs without the green light in the prompt. By default, the work stops at the push of the branch.

## Opening the PR

```powershell
gh pr create --base main --head <branch> --title "<type>: <summary>" --body-file .tmp/pr.md
```

The body goes through a file: a quote or a line break breaks an inline `--body`. `.tmp/` is git-ignored. Expected content:

```markdown
## Why
## What changes
## Checks
npm run check: N pages, 0 errors. npm test: N tests, 0 failures.
## Manual actions
```

`gh` returns the URL of the PR: give it in the task report.

## Squash merge, after the green light

```powershell
gh pr checks <number> --watch
gh pr merge <number> --squash --delete-branch
git checkout main; git pull origin main
```

`--squash` gives one commit per task on `main`. `--delete-branch` removes the branch on both sides.

⚠️ The tooling of the agent can block a merge, even after a green light. Do not work around it: explain the block and ask for a confirmation in the last message.

## Checking afterwards

```powershell
gh pr list --state merged --limit 5
git log origin/main --oneline -5
```
