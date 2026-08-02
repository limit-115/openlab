# AI Research Lab

Local autonomous research runtime described in
[`AI_Research_Lab_MVP_SPEC.md`](./AI_Research_Lab_MVP_SPEC.md).

## Repository layout

- `apps/cli` — the `lab` command;
- `apps/daemon` — orchestration process and local status API;
- `apps/dashboard` — Vite + React observer UI;
- `packages/protocol` — stable runtime contracts and JSON schemas;
- `packages/core` — research state machine and scheduling;
- `packages/db` — PostgreSQL persistence;
- `packages/harness` — subscription-authenticated Codex and Claude CLI harnesses;
- `packages/executor` — local experiment execution.

Operational state belongs in PostgreSQL. Files in a lab workspace are durable
artifacts and protocol snapshots that can be inspected or exported independently.

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
pnpm lab start examples/task.example.json
```

The daemon applies database migrations before opening a run. It invokes agents only through the
locally installed `codex` and `claude` CLI harnesses. API keys and usage-based model API fallbacks
are intentionally unsupported.

## Commands

```bash
pnpm lab status
pnpm lab frontier
pnpm lab inspect <claim-or-experiment-id>
pnpm lab capabilities
pnpm lab provide <request-id> <resource-reference>
pnpm lab wake
pnpm lab stop
pnpm lab export
```

The dashboard is served by the daemon when `apps/dashboard/dist` exists. Build it with
`pnpm --filter @lab/dashboard build` before starting the run.

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

## Verification

```bash
pnpm check
```

Database integration suites create disposable PostgreSQL 18 instances with Testcontainers and
remove them after the test run.
