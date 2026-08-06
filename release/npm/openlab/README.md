# OpenLab

Local autonomous AI research runtime.

**This package only holds the name.** OpenLab is not published to npm yet — a release is one
executable with its runtime inside it, installed from [openlab.bot](https://openlab.bot):

```bash
curl -fsSL https://openlab.bot/install.sh | sh
```

```powershell
irm https://openlab.bot/install.ps1 | iex
```

Node, pnpm and a toolchain are not requirements. The lab dispatches every agent to a locally
authenticated `codex`, `claude` or `glm` CLI running on your own product subscription, and
`openlab doctor` says which of them it can find.

Apache-2.0.
