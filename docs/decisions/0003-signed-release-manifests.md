# 0003 — Signed release manifests

## Status

Accepted on 2026-08-07.

## Decision

The release manifest is signed with Ed25519. The signature is detached and published beside it as
`manifest.json.sig`, base64 over the exact bytes served. `openlab update` verifies it against a set
of public keys compiled into the lab, and installs nothing from a manifest it cannot verify.

A digest inside the manifest proves that an archive is the one the manifest described. It proves
nothing about the manifest. Whoever can put a manifest in front of a lab writes their own digests
into it and puts their own archives behind them, and every check the lab made until now passed. The
signature is what makes the description itself checkable, and it matters more for an update than for
an install because an update runs again and again on its own schedule.

The choices inside that:

- **Ed25519 through `node:crypto`.** Nothing is added to a release to make this possible, and the
  key that signs is produced and used by `openssl`, which every runner and every developer has.
- **Detached, not embedded.** The manifest's shape never changes, so nothing that reads it has to
  learn a new field, and the signature can be published for a release whose format predates it.
- **A set of keys, not one.** Rotation has to overlap: a new key is added to
  `manifest-signature.const.ts` and released first, so labs already installed trust it before
  anything is signed with it alone. The old key comes out a release later.
- **`OPENLAB_RELEASES_KEY` adds a key rather than replacing them.** A mirror is only useful if a lab
  will install from it, and a lab installs from nothing it cannot check. Naming a key opens a
  mirror; it does not close the published releases.
- **The bootstrap installers do not verify.** `install.sh` and its two siblings are fetched from
  openlab.bot and piped to a shell: at that moment the script is the trust root, and a signature it
  checked would be a signature served by whoever served the script. Every install after the first
  is verified against a key inside a binary the operator already has.

## Consequences

A release cannot be published without `OPENLAB_SIGNING_KEY` in the repository secrets, and a key
that no released lab trusts fails the release rather than an operator's update: `release/sign-release.ts`
verifies its own output against the compiled-in keys before writing it.

Losing the private key means no further release can be updated to. The recovery is a new key added
to the trusted set, released, and then signed with — which requires one release signed by the old
key, so the key is worth keeping backed up somewhere that is not one laptop.

An operator running a mirror has to sign it. That is the cost of a lab refusing to install from
anything it cannot check, and it is stated in the refusal itself, which names the variable.
