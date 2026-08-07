import { createPrivateKey, sign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signedByATrustedKey } from "@openlab/core/release-channel/manifest-signature";
import {
    SIGNATURE_SUFFIX,
    TRUSTED_RELEASE_KEYS
} from "@openlab/core/release-channel/manifest-signature.const";

const REPOSITORY = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST = path.join(REPOSITORY, "release", "dist", "manifest.json");

/** Where the key that signs a release comes from, which is never a file in this repository. */
const SIGNING_KEY_VARIABLE = "OPENLAB_SIGNING_KEY";

/**
 * Signs the release manifest.
 *
 * A digest inside the manifest proves that an archive is the one described. The signature is what
 * proves the description: without it, anyone able to put a manifest in front of a lab puts their
 * own digests in it, and every check the lab makes passes against the wrong file.
 *
 * The signature is detached and published beside the manifest, so the manifest itself never changes
 * shape. A lab installed before signing existed reads the same file it always did.
 */
async function signRelease(): Promise<void> {
    const pem = process.env[SIGNING_KEY_VARIABLE];
    if (pem === undefined || pem.trim().length === 0) {
        throw new Error(`${SIGNING_KEY_VARIABLE} states no key to sign this release with.`);
    }

    const manifest = await readFile(MANIFEST);
    const signature = sign(null, manifest, createPrivateKey(asPem(pem))).toString("base64");

    /**
     * Checked here against the keys compiled into the lab, because the alternative is finding out
     * from an operator whose update refuses a release that was signed with a key nobody trusts.
     */
    if (!signedByATrustedKey(manifest.toString(), signature, TRUSTED_RELEASE_KEYS)) {
        throw new Error(
            `${SIGNING_KEY_VARIABLE} is not a key any released lab trusts, so nothing could update off this release.`
        );
    }

    const written = `${MANIFEST}${SIGNATURE_SUFFIX}`;
    await writeFile(written, `${signature}\n`, "utf8");
    process.stdout.write(`signed ${path.relative(REPOSITORY, written)}\n`);
}

/** A key out of a secret store usually arrives with its line breaks written out rather than taken. */
function asPem(key: string): string {
    return key.includes("\\n") ? key.replaceAll("\\n", "\n") : key;
}

await signRelease();
