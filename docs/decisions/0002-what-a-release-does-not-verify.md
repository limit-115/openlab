# 0002 — What a release does not verify

## Status

Accepted on 2026-08-07.

## Decision

A release is cross-compiled for five platforms on one Linux machine, and every one of them is then
unpacked, installed, updated and run on a machine of its own before anything is published. Four are.
`darwin-x64` is not, and is published having never been executed.

There is no hosted Intel macOS runner to execute it on: the images are arm64. The alternatives were
each rejected:

- dropping `darwin-x64` would abandon Intel Macs, which are still in use and can still run the lab;
- a self-hosted Intel runner is a machine to own, patch and trust for one smoke test per release;
- running it under Rosetta on an arm64 runner tests Rosetta, not the machine it is published for.

So the target stays, unverified, and this is written down rather than left to be discovered. The two
workflows that build and verify releases say the same thing beside the matrix that omits it.

## Consequences

A defect that shows only on Intel macOS reaches an operator before it reaches us. Everything a
release shares across platforms is still covered by the four that are run, so what can hide here is
narrow: the compiled output for one architecture, and nothing above it.

`openlab update` makes this cost slightly worse rather than better, because it installs a binary
nobody ran and points the launcher at it. What contains it is the layout: the previous version stays
on disk, and `openlab update <previous>` puts it back without a network.

This is lifted the moment a hosted Intel macOS image exists again, or the moment Intel Macs stop
being worth building for — whichever comes first. Adding the runner is one entry in the matrix of
`.github/workflows/ci.yml` and one in `.github/workflows/release.yml`.
