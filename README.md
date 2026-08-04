# AI Research Lab

Local autonomous research runtime described in
[`AI_Research_Lab_MVP_SPEC.md`](./AI_Research_Lab_MVP_SPEC.md).

## Repository layout

- `apps/cli` — the `lab` command;
- `apps/daemon` — orchestration process and local status API;
- `apps/dashboard` — Vite + React observer UI;
- `packages/protocol` — stable runtime contracts and JSON schemas;
- `packages/core` — lab lifecycle rules;
- `packages/db` — PostgreSQL persistence;
- `packages/harness` — subscription-authenticated Codex and Claude CLI harnesses;
- `packages/executor` — local experiment execution.

One lab holds many investigations. Each investigation is one goal with its own agents, its own run
directory and its own research loop, running alongside the others.

Operational state belongs in PostgreSQL. Files in a run directory are durable artifacts and
protocol snapshots that can be inspected or exported independently.

## Local setup

Requirements:

- Node.js `24.18.1` through `fnm`;
- pnpm `11.18.0`;
- PostgreSQL 18;
- Docker for the integration test suites;
- a locally authenticated Codex CLI or Claude CLI product subscription.

```bash
fnm use
pnpm install --frozen-lockfile
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ai_research_lab
pnpm lab start
```

The lab starts empty. Open the dashboard to add an investigation, or use the CLI:

```bash
pnpm lab new --goal "Find and verify a faster implementation of a reference algorithm"
pnpm lab new --file examples/investigation.example.json
```

The daemon applies database migrations before it opens, and reopens every investigation it already
holds. It invokes agents only through the locally installed `codex`, `claude` and `glm` CLI
harnesses. API keys and usage-based model API fallbacks are intentionally unsupported.

## Commands

```bash
pnpm lab list
pnpm lab status
pnpm lab bets
pnpm lab inspect <bet-finding-verdict-or-run-id>
pnpm lab capabilities
pnpm lab answer <request-id> <answer>
pnpm lab wake
pnpm lab stop
pnpm lab export
pnpm lab rm <investigation-id>
pnpm lab purge
```

Every command above is about one investigation. With a single investigation the lab picks it; with
several, name it with `-i/--investigation <id>`.

`rm` discards one investigation, its history and its run directory, and works while the lab is
running. `purge` empties the lab instead: it refuses while a daemon is answering, and confirms
before deleting.

The dashboard is served by the daemon when `apps/dashboard/dist` exists. Build it with
`pnpm --filter @lab/dashboard build` before starting the lab.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection URL |
| `LAB_HOME` | `.lab` | Run workspaces and durable artifacts |
| `LAB_HOST` | `127.0.0.1` | Local status server host |
| `LAB_PORT` | `4318` | Local status server port |
| `LAB_DASHBOARD_ROOT` | `apps/dashboard/dist` | Built dashboard directory |
| `LAB_LOG_LEVEL` | `info` | Fastify log level |

Environment values are validated at startup. Empty values are treated as unset.

Where the lab runs is environment; what it runs with is not. The harness roster a new investigation
starts on, and the model and reasoning effort behind each of the director, researcher and verifier
roles, are set on the dashboard's settings page and kept in the database. They apply to the next
agent the lab dispatches, without a restart. An investigation that named its own roster keeps it,
and a role that names no model is left to the harness default.

The settings page also reports what each run directory takes up under `LAB_HOME`, including
directories left behind by investigations the lab no longer holds, and purges the lab through the
running daemon so every investigation's agents stop before its history and directory are deleted.

## Verification

```bash
pnpm check
```

Database integration suites create disposable PostgreSQL 18 instances with Testcontainers and
remove them after the test run.
