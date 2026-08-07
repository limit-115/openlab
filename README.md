# OpenLab

Local autonomous research runtime described in
[`OpenLab_MVP_SPEC.md`](./OpenLab_MVP_SPEC.md).

## Repository layout

- `apps/cli` — the `openlab` command;
- `apps/daemon` — orchestration process and local status API;
- `apps/dashboard` — Vite + React observer UI;
- `packages/protocol` — stable runtime contracts and JSON schemas;
- `packages/core` — lab lifecycle rules;
- `packages/db` — the lab's SQLite database;
- `packages/harness` — subscription-authenticated Codex and Claude CLI harnesses;
- `packages/notifier` — the channels the lab reaches its operator through;
- `packages/executor` — local experiment execution.

One lab holds many investigations. Each investigation is one goal with its own agents, its own run
directory and its own research loop, running alongside the others.

Operational state belongs in the database, a single SQLite file at `openlab.db` in `OPENLAB_HOME`. Files in
a run directory are durable artifacts and protocol snapshots that can be inspected or exported
independently. A lab is therefore a directory: copy it to keep it, delete it to be rid of it.

## Install

macOS and Linux:

```bash
curl -fsSL https://openlab.bot/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://openlab.bot/install.ps1 | iex
```

Windows command prompt:

```bat
curl -fsSL https://openlab.bot/install.cmd -o install.cmd && install.cmd && del install.cmd
```

Then:

```bash
openlab doctor
openlab start
```

The one thing OpenLab cannot install for you is an agent to think with. It dispatches every agent to
a locally authenticated `codex`, `claude`, `glm` or `deepseek` CLI harness — the first three on a
product subscription you already hold, DeepSeek on a key you give it — and `openlab doctor` says
which of them it can find.

Nothing else is needed. Node, pnpm and a toolchain are not requirements: a release is one executable
with its runtime inside it, and the dashboard and migrations installed beside it.

The installer needs no administrator rights and touches two places — `~/.openlab` for the program
and one line in a shell startup file so that `openlab` is on your `PATH`. Set `OPENLAB_INSTALL_DIR`
to put the command somewhere else, or pass `--no-modify-path` to be left alone entirely. Your lab's
own data lives elsewhere again, under `OPENLAB_HOME`, and no install or uninstall ever touches it.

```bash
openlab uninstall   # takes the program back out, leaves your lab where it is
```

## Update

```bash
openlab update            # move to the release published now
openlab update --check    # say what is published and install nothing
openlab update 0.1.0      # go back to a version you name
```

A lab that is already running is not disturbed. Each version installs into a directory of its own
and the command you type is a launcher pointing at one of them, so an update lands beside the
version that is answering and moves the launcher; whatever is running keeps running the release it
started on until you restart it.

The version an update replaced stays on disk, which is what makes going back a command rather than
a download — `openlab update <version>` on a release still installed needs no network at all.
Anything older than that is deleted, and `--no-prune` keeps it.

Starting a lab asks the release channel at most once a day and says one line if there is something
newer. It installs nothing on its own: a lab that researches for hours is not a lab to change
underneath, so when to take an update is yours to decide.

Set `OPENLAB_RELEASES_URL` to update from a mirror rather than from GitHub. Its manifest has to be
signed by a key the lab trusts, so name yours in `OPENLAB_RELEASES_KEY`.

Every archive is verified against a digest published in the release manifest before anything is
unpacked, and a mismatch stops the install rather than warning about it.

`openlab update` goes one further and checks who published the manifest. A digest only proves that
an archive is the one the manifest described, so a channel able to put a manifest in front of your
lab could put its own digests in it and its own archives behind them. The manifest is signed, and
the key it is signed with is compiled into the lab: a manifest signed by anything else is refused
and nothing is installed. The first install is the one exception — it trusts the site you fetched
the script from, because at that point there is no lab yet to hold a key.

Releases are built by GitHub Actions and attested, so what you downloaded can be traced back to the
workflow that built it:

```bash
gh attestation verify openlab-<version>-<platform>.tar.gz --repo limit-115/openlab
```

## Running from the sources

Requirements:

- Node.js `24.18.1` through `fnm`;
- pnpm `11.18.0`;
- a locally authenticated Codex CLI or Claude CLI product subscription.

```bash
fnm use
pnpm install --frozen-lockfile
pnpm openlab start
```

There is no build step: Node runs the TypeScript in this repository as it is. The database needs
nothing installed either — it is opened through the SQLite the runtime already carries, and created
on first start beside the runs it is about.

A release is built with Bun, which compiles the sources and its own runtime into one executable per
platform. Both runtimes carry a SQLite of their own and neither can see the other's, so the lab
opens its database through a driver chosen at startup. That seam is the only place the two differ.

```bash
pnpm release                 # every platform, into release/dist
pnpm release darwin-arm64    # just one
```

The lab starts empty. Open the dashboard to add an investigation, or use the CLI:

```bash
pnpm openlab new --goal "Find and verify a faster implementation of a reference algorithm"
pnpm openlab new --file examples/investigation.example.json
```

The daemon applies database migrations before it opens, and reopens every investigation it already
holds. It invokes agents only through the CLI harnesses installed on this machine: `codex`, `claude`,
`glm` and `deepseek`. Three of them run on a subscription you already bought, which is the way this
is meant to be run. DeepSeek is the exception — it bills a wallet by the token, nothing caps it, and
its setup card says so before you hand over a key.

## Commands

```bash
pnpm openlab list
pnpm openlab status
pnpm openlab bets
pnpm openlab inspect <bet-finding-verdict-or-run-id>
pnpm openlab capabilities
pnpm openlab answer <request-id> <answer>
pnpm openlab wake
pnpm openlab stop
pnpm openlab export
pnpm openlab rm <investigation-id>
pnpm openlab purge
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
`pnpm --filter @openlab/dashboard build` before starting the lab.

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
- **Storage** — what each run directory takes up under `OPENLAB_HOME`, including directories left behind
  by investigations the lab no longer holds, and a purge through the running daemon so every
  investigation's agents stop before its history and directory are deleted.

The interface is written in English and Russian, and drawn in a light or dark palette. Both are
chosen from the sidebar and kept in the browser rather than the database: they are how one operator
reads the lab, not part of how it runs.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENLAB_HOME` | `$XDG_DATA_HOME/openlab` | The lab's database, run workspaces and durable artifacts |
| `OPENLAB_HOST` | `127.0.0.1` | Local status server host |
| `OPENLAB_PORT` | `4318` | Local status server port |
| `OPENLAB_DASHBOARD_ROOT` | `apps/dashboard/dist` | Built dashboard directory |
| `OPENLAB_LOG_LEVEL` | `warn` | Fastify log level, raised to `info` by `openlab start --verbose` |
| `OPENLAB_API_URL` | `http://127.0.0.1:4318` | Daemon the CLI talks to |

Environment values are validated at startup. Empty values are treated as unset. Every variable above
is read by the daemon except `OPENLAB_API_URL`, which is how the CLI finds it. The database is not among
them: one home is one lab, so pointing `OPENLAB_HOME` somewhere else moves the database with the runs it
belongs to.

A lab belongs to whoever runs it, not to the directory it was started in, so `OPENLAB_HOME` falls back to
the XDG data directory — `~/.local/share/lab` on a machine that leaves `XDG_DATA_HOME` unset, macOS
included. A relative `XDG_DATA_HOME` is ignored as the specification asks; a relative `OPENLAB_HOME` is
an operator naming a home and resolves against the working directory, which is how `OPENLAB_HOME=./.openlab`
gives a throwaway lab. Nothing expands a leading `~` inside a launch agent or a unit file, so the lab
expands one itself.

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

A suite that touches the database opens a migrated one of its own in a temporary directory and
takes it away afterwards, so the tests need nothing installed and never share state.

## License

OpenLab is released under the [Apache License 2.0](./LICENSE). Run it, change it, ship it inside
something else, commercially or not; the license asks only that the notice travels with it and that
changed files say they were changed.

Two things it settles that a shorter license leaves open. Section 3 grants a patent license
alongside the copyright one, so an operator running the lab inside a company is not resting on an
implied grant. Section 6 grants nothing over the OpenLab name or the marks in `brand`, which stay
with the copyright holder and are stated in [`NOTICE`](./NOTICE).

Contributing needs no separate agreement. Section 5 already places anything deliberately submitted
under these same terms, so a pull request is the entire formality.
