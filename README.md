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
