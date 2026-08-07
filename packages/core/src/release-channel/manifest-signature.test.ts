import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signedByATrustedKey, trustedReleaseKeys } from "#src/release-channel/manifest-signature";
import {
    RELEASES_KEY_VARIABLE,
    TRUSTED_RELEASE_KEYS
} from "#src/release-channel/manifest-signature.const";

const MANIFEST = '{"version":"0.2.0","artifacts":{}}';

function keyPair() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    return {
        pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
        signature: (over: string) => sign(null, Buffer.from(over), privateKey).toString("base64")
    };
}

describe("checking who signed a release manifest", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("accepts a manifest signed by a key it trusts", () => {
        const key = keyPair();

        expect(signedByATrustedKey(MANIFEST, key.signature(MANIFEST), [key.pem])).toBe(true);
    });

    /**
     * This is the whole point. Whoever can put a manifest in front of a lab can put their own
     * digests in it and their own archives behind them, and every check the lab makes then passes.
     */
    it("refuses a manifest signed by a key it does not trust", () => {
        const theirs = keyPair();
        const ours = keyPair();

        expect(signedByATrustedKey(MANIFEST, theirs.signature(MANIFEST), [ours.pem])).toBe(false);
    });

    /** A signature over something else is a signature over something else. */
    it("refuses a signature taken over a different manifest", () => {
        const key = keyPair();
        const tampered = MANIFEST.replace("0.2.0", "9.9.9");

        expect(signedByATrustedKey(tampered, key.signature(MANIFEST), [key.pem])).toBe(false);
    });

    /** Refusing to check is how a signature is defeated by simply not publishing one. */
    it("refuses a manifest with no signature at all", () => {
        const key = keyPair();

        expect(signedByATrustedKey(MANIFEST, "", [key.pem])).toBe(false);
        expect(signedByATrustedKey(MANIFEST, "   \n", [key.pem])).toBe(false);
    });

    it("refuses everything when it trusts nothing", () => {
        const key = keyPair();

        expect(signedByATrustedKey(MANIFEST, key.signature(MANIFEST), [])).toBe(false);
    });

    /** Rotation has to overlap, so any one of the trusted keys is enough. */
    it("accepts the second key while the first is still trusted", () => {
        const retiring = keyPair();
        const arriving = keyPair();

        expect(
            signedByATrustedKey(MANIFEST, arriving.signature(MANIFEST), [
                retiring.pem,
                arriving.pem
            ])
        ).toBe(true);
    });

    /** A key that will not even load is not a reason to stop trying the ones that will. */
    it("keeps checking past a key it cannot read", () => {
        const key = keyPair();

        expect(
            signedByATrustedKey(MANIFEST, key.signature(MANIFEST), ["not a key at all", key.pem])
        ).toBe(true);
    });

    /** A key pasted through a secret store usually arrives with its line breaks written out. */
    it("reads a key whose line breaks were written out rather than taken", () => {
        const key = keyPair();
        const escaped = key.pem.replaceAll("\n", "\\n");

        expect(signedByATrustedKey(MANIFEST, key.signature(MANIFEST), [escaped])).toBe(true);
    });
});

describe("which keys a lab trusts", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("trusts what it was built trusting", () => {
        expect(trustedReleaseKeys({})).toEqual(TRUSTED_RELEASE_KEYS);
    });

    /**
     * A mirror is somewhere a lab can also install from, never somewhere it now has to: naming a
     * key of your own must not quietly stop the published releases from being installable.
     */
    it("adds the key an operator named without dropping its own", () => {
        const key = keyPair();

        const trusted = trustedReleaseKeys({ [RELEASES_KEY_VARIABLE]: key.pem });

        expect(signedByATrustedKey(MANIFEST, key.signature(MANIFEST), trusted)).toBe(true);
        for (const built of TRUSTED_RELEASE_KEYS) {
            expect(trusted).toContain(built);
        }
    });

    it("treats a variable set to nothing as a variable nobody set", () => {
        expect(trustedReleaseKeys({ [RELEASES_KEY_VARIABLE]: "  " })).toEqual(TRUSTED_RELEASE_KEYS);
    });
});
