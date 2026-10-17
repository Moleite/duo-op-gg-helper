# Documentation index

> **Answers**: which file to open for a task.
> **Does not answer**: the rules of the project → [`../AGENTS.md`](../AGENTS.md) · a symptom → [`01-SYMPTOMS.md`](01-SYMPTOMS.md)

Find the sentence that matches the task, then open one file.

## Understanding

| Need | File |
| ---- | ---- |
| the framework: Chrome contexts, modules, recompute cycle | [`architecture/overview.md`](architecture/overview.md) |
| where a setting goes (constant, registry, local database, secret) | [`architecture/config.md`](architecture/config.md) |
| how a row of the site becomes a post, traps of the DOM | [`architecture/dom-selectors.md`](architecture/dom-selectors.md) |
| the GraphQL API of the site, the cursor of Show more | [`architecture/site-api.md`](architecture/site-api.md) |
| what goes in the panel or the popup, hiding without breaking React | [`architecture/panel.md`](architecture/panel.md) |
| how a rule decides, why a post is hidden | [`filters/rules.md`](filters/rules.md) |
| which ranks can play together | [`filters/ranks.md`](filters/ranks.md) |
| the tables and what a row represents | [`database/schema.md`](database/schema.md) |
| the local database, the sync, the Neon wake-ups | [`database/sync.md`](database/sync.md) |
| the Neon roles, RLS, the security of the connection string | [`database/neon.md`](database/neon.md) |
| what the v1 did, what it became | [`project/v1.md`](project/v1.md) |
| what is left to do and to check | [`project/todo.md`](project/todo.md) |
| the name of a notion | [`vocabulary.md`](vocabulary.md) |

## Doing

| Need | File |
| ---- | ---- |
| installing, reloading, setting up Neon, preparing a machine | [`run/getting-started.md`](run/getting-started.md) |
| running the tests, knowing what each one proves | [`run/tests.md`](run/tests.md) |
| adding a rule or a sort | [`filters/rules.md`](filters/rules.md#adding-a-rule) |
| repairing a selector after a site update | [`architecture/dom-selectors.md`](architecture/dom-selectors.md#the-site-changed) |
| adding a capture of the site, pseudonymizing it | [`architecture/dom-captures.md`](architecture/dom-captures.md) |
| creating the database, adding a player | [`database/neon.md`](database/neon.md#creating-the-database) |
| changing the schema | [`database/schema.md`](database/schema.md#changing-the-schema) |
| reading the database from the terminal | [`database/sql-cli.md`](database/sql-cli.md) |
| branching, committing, versioning, knowing what the green light allows | [`git/workflow.md`](git/workflow.md) |
| opening a PR, merging | [`git/pull-requests.md`](git/pull-requests.md) |
| preparing one-click posting | [`project/todo.md`](project/todo.md#one-click-posting) |
| writing documentation or a comment | [`STYLE.md`](STYLE.md) |
| splitting a page, budgets, layers | [`CONVENTIONS.md`](CONVENTIONS.md) |

## Facts generated from the code

| List | File |
| ---- | ---- |
| rules, default thresholds, sorts | [`generated/rules.md`](generated/rules.md) |
| DOM selectors of the site | [`generated/selectors.md`](generated/selectors.md) |
| table columns | [`generated/schema.md`](generated/schema.md) |
| messages of the service worker, operations of the local database | [`generated/operations.md`](generated/operations.md) |

## History of the decisions

[`journal/`](journal/) holds the dated stories. Search it with `grep`, never load it whole.
