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
- `packages/notifier` — the channels the lab reaches its operator through;
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

`status`, `bets`, `inspect`, `capabilities`, `answer`, `wake`, `stop` and `export` are each about one
investigation. With a single investigation the lab picks it; with several, name it with
`-i/--investigation <id>`. `--json` prints any command machine-readably, and `--api-url` points the
CLI at a daemon other than the local default.

`rm` discards one investigation, its history and its run directory, and works while the lab is
running. `purge` empties the lab instead: it refuses while a daemon is answering, and confirms
before deleting.

## Dashboard

The dashboard is served by the daemon when `apps/dashboard/dist` exists. Build it with
`pnpm --filter @lab/dashboard build` before starting the lab.

It reads the lab live: every investigation the lab holds, what each one is doing, its team, its
event stream and what it ended up as. The settings page holds four panels, and only the open one
asks the daemon for anything:

- **Harnesses** — the roster a new investigation starts on, and the model and reasoning effort
  behind each of the director, researcher and verifier roles;
- **Subscriptions** — what each authenticated subscription has left and when the reading was taken,
  refreshed on its own and on demand, with a limiter on every window that says how far into it the
  lab may spend;
- **Notifications** — the channels the lab reaches the operator through when nobody is watching
  this page, which moments each one reports and what language it writes in;
- **Storage** — what each run directory takes up under `LAB_HOME`, including directories left behind
  by investigations the lab no longer holds, and a purge through the running daemon so every
  investigation's agents stop before its history and directory are deleted.

The interface is written in English and Russian, and drawn in a light or dark palette. Both are
chosen from the sidebar and kept in the browser rather than the database: they are how one operator
reads the lab, not part of how it runs.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection URL |
| `LAB_HOME` | `.lab` | Run workspaces and durable artifacts |
| `LAB_HOST` | `127.0.0.1` | Local status server host |
| `LAB_PORT` | `4318` | Local status server port |
| `LAB_DASHBOARD_ROOT` | `apps/dashboard/dist` | Built dashboard directory |
| `LAB_LOG_LEVEL` | `info` | Fastify log level |
| `LAB_API_URL` | `http://127.0.0.1:4318` | Daemon the CLI talks to |

Environment values are validated at startup. Empty values are treated as unset. Every variable above
is read by the daemon except `LAB_API_URL`, which is how the CLI finds it.

Where the lab runs is environment; what it runs with is not. The harness roster a new investigation
starts on, and the model and reasoning effort behind each role, are set on the dashboard's settings
page and kept in the database. They apply to the next agent the lab dispatches, without a restart.
An investigation that named its own roster keeps it, and a role that names no model is left to the
harness default.

## Spend caps

A subscription window can be capped short of the vendor's own ceiling: 80% of the five-hour window,
60% of the weekly one. The lab reads the caps before it prepares a run, so a subscription that has
reached one is passed over exactly as a spent one is — the work moves to the next harness in the
investigation's roster, and a run already under way finishes rather than being killed mid-thought.

Nothing is asked of the operator for a limit they set themselves. When every subscription an
investigation may use is blocked, it hibernates on what each one answered and dates the sleep by the
first window due back, then takes itself up again then. A vendor that has genuinely stopped serving
is still raised as a capability request, because only the operator can restore that.

An investigation held at the caps has two ways out, both on its own page: point it at a subscription
with headroom, or let it spend past the caps. The second is per investigation and never buys past a
vendor's own ceiling. Changing either gives up the cycle in flight, because a research loop reads
its roster when it starts.

## Notifications

Research runs for hours, so the lab can tell an operator who is not watching the dashboard. It
reports five moments, and nothing else: a finding survived verification, the lab needs something it
cannot get itself, an investigation failed, an investigation went to sleep, or a harness is not
ready to dispatch to. Each channel chooses which of those it wants and which language it is written
in, so a message is never a stream to be tuned out.

Telegram is the first channel. Create a bot with [@BotFather](https://t.me/BotFather), start a chat
with it or add it to a group, then set the token and the chat on the dashboard's settings page. The
token is stored in the database and never served back: the page is told one is held rather than
what it is, and an update that names no token keeps the stored one. **Send a test message** writes
through what the lab has stored, so a channel is proved rather than assumed.

Reporting happens alongside the research rather than inside it. A channel that refuses a message is
written to the daemon log and the research loop carries on. Adding another channel is a module in
`packages/notifier`, a case in the daemon's channel roster and a card on the settings page; nothing
about what the lab considers worth reporting changes with it.

## Verification

```bash
pnpm check
```

Database integration suites create disposable PostgreSQL 18 instances with Testcontainers and
remove them after the test run.
