# 0002 — Runtime-neutral sources, a Bun-compiled lab

## Status

Accepted on 2026-08-06.

## Decision

The lab is distributed as one compiled binary per platform, built with `bun build --compile`. The
sources stay runtime-neutral: a developer runs them on Node through type stripping with no build
step, and the artifact an operator installs carries Bun.

Five targets are supported: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64` and
`windows-x64`. Linux targets are built against glibc; musl is not published.

An operator installs through a bootstrap script — `install.sh` on macOS and Linux, `install.ps1` and
`install.cmd` on Windows — that resolves the platform, verifies a SHA-256 from a release manifest,
and hands the verified binary its own `install` subcommand. The layout on disk is decided by the
lab, not by the script.

## Consequences

Nothing has to be installed to run the lab. Node, pnpm and an authenticated agent CLI stop being
things an operator must acquire before the first command; only the agent CLI remains, and it is a
subscription the lab cannot supply anyway.

Two runtimes have to agree. Where they do not, the difference is confined behind a contract rather
than spread through the lab. There is exactly one such place today, and it is the reason this
decision needed measuring rather than assuming:

- **SQLite.** Bun's own documentation calls `node:sqlite` fully implemented. Bun 1.3.14 does not
  resolve it at all — neither statically, nor dynamically, nor in a compiled binary. The lab opens
  its database through `LabSqliteConnection`, with a `node:sqlite` driver and a `bun:sqlite` driver
  behind it, chosen once at load. Both were driven through the lab's own access patterns — pragmas,
  positional reads, a read matching nothing, commit, rollback, cascade, a refused foreign key — and
  answered identically.
- **Subprocesses.** Every agent runs through `execa`, and the lab depends on more of it than the
  common path: a replaced environment, a cancel signal, per-stream buffering, and escalation to
  `SIGKILL` for an agent that ignores `SIGTERM`. All of it behaves the same on both runtimes,
  against the real `claude` and `codex` CLIs, down to the kill escalating at the same millisecond.

Startup was measured on the real CLI, and it is worth separating where the gain comes from, because
half of it is not about the runtime at all:

| How the CLI is started | `--version`, mean of 15 |
| --- | --- |
| Node on the sources, as a developer runs it | 553 ms |
| Node on a bundle of those sources | 156 ms |
| Compiled with `bun build --compile` | 50 ms |

Bundling accounts for the larger share; Bun accounts for the rest. A developer keeps the 553 ms and
the ability to edit a file and run it, which is the trade the first row is paying for.

An artifact is roughly 60 MB per platform, because it carries a JavaScript runtime. This is the
price of the first row of the table above, and it is paid once per release rather than per command.

Node's own single-executable feature was considered and rejected: it is still stability 1.1, it
cannot cross-compile with a code cache, it breaks the macOS signature on injection, and it would
force the migrations and the dashboard into its asset API. Bun cross-compiles every target from one
machine, including Windows, which is the only reason Windows is in the first release at all.

## What this does not decide

The development runtime. Tests still run on Vitest under Node, dependencies are still installed with
pnpm, and the repository's rule that no build step stands between an operator and a lab running from
these sources is unchanged. Bun is how the lab is packaged, not how it is written.
