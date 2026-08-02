# 0001 — Subscription-authenticated CLI harnesses

## Status

Accepted on 2026-08-02.

## Decision

All model-backed agents run as local Codex CLI or Claude CLI subprocesses authenticated by the
operator's active product subscription. The lab does not call model APIs directly.

The runtime must:

- verify the active authentication method before starting an agent;
- remove API-key and API-token environment variables from every harness process;
- reject an execution when subscription authentication cannot be proven;
- persist the harness kind, version, session identifier, event stream, exit state, and artifacts;
- create a `CapabilityRequest` instead of falling back to usage-based API access.

Direct model provider SDKs and automatic API fallbacks are forbidden, including dormant fallbacks.

## Consequences

Subscription rate limits can pause a branch. The scheduler may move work to another authenticated
CLI harness, but it may not bypass the limit through API billing. Harness behavior is normalized
behind a provider-neutral interface so research scheduling remains independent from either CLI.
