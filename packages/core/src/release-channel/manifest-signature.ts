import { createPublicKey, verify } from "node:crypto";
import {
    RELEASES_KEY_VARIABLE,
    TRUSTED_RELEASE_KEYS
} from "#src/release-channel/manifest-signature.const";

/**
 * Whether a manifest was signed by a key this lab trusts.
 *
 * The signature is over the bytes the channel served, not over anything read out of them, so a
 * manifest has to be checked before it is parsed and installed from. Ed25519 is what signs it,
 * which the runtime already has: nothing is added to a release to make this possible.
 *
 * Every trusted key is tried and any one of them is enough, which is what lets a key be rotated
 * without every lab already installed losing the ability to update on the day it changes.
 */
export function signedByATrustedKey(
    manifest: string,
    signature: string,
    keys: readonly string[]
): boolean {
    const signed = Buffer.from(signature.trim(), "base64");
    if (signed.length === 0) {
        return false;
    }

    return keys.some((key) => {
        try {
            return verify(null, Buffer.from(manifest), createPublicKey(asPem(key)), signed);
        } catch {
            /** A key that will not load signs nothing, and is not a reason to stop trying the rest. */
            return false;
        }
    });
}

/**
 * Every key a release may be signed with here: the ones this lab was built trusting, and the one an
 * operator running their own channel named. Theirs is added and never substituted, so a mirror is
 * something a lab can also install from rather than somewhere it now has to.
 */
export function trustedReleaseKeys(
    environment: NodeJS.ProcessEnv = process.env
): readonly string[] {
    const named = environment[RELEASES_KEY_VARIABLE]?.trim();
    return named === undefined || named.length === 0
        ? TRUSTED_RELEASE_KEYS
        : [...TRUSTED_RELEASE_KEYS, named];
}

/**
 * A key as the crypto library wants it.
 *
 * A key that travelled through an environment variable or a secret store often arrives with its
 * line breaks written out rather than taken, and a key nobody can paste is a mirror nobody can run.
 */
function asPem(key: string): string {
    return key.includes("\\n") ? key.replaceAll("\\n", "\n") : key;
}
