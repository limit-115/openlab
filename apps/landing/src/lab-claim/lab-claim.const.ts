/**
 * The four facts that answer what a reader is actually weighing while their cursor is over the copy
 * button: what it will cost them, whether it runs where they are, what it drags in, and what they
 * are allowed to do with it. Each one is checkable — the licence is in the repository, the platforms
 * are the three the installers cover, and a release is one executable with its runtime inside it.
 */
export const CLAIM_PROOF = [
    "Apache-2.0",
    "macOS, Linux, Windows",
    "One executable, no toolchain",
    "Nothing to sign up for"
] as const;
