import { describe, expect, it } from "vitest";
import { CapabilityResourceReferenceSchema } from "#src/capabilities/capability-resource-reference.schema";

const SafeCapabilityReference = {
    DATASET: "dataset://independent/v1",
    TOOLCHAIN: "toolchain://node/24",
    KEYCHAIN: "keychain://ai-research-lab/github",
    FILE: "file:///tmp/research-dataset.csv"
} as const;

const UnsafeCapabilityReference = {
    OPENAI_KEY: "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
    BEARER_TOKEN: "Bearer abcdefghijklmnopqrstuvwxyz012345",
    LONG_TOKEN: "a".repeat(96),
    API_KEY_PLAINTEXT: "api-key: abcdefghijklmnopqrstuvwxyz",
    ARBITRARY_PLAINTEXT: "/tmp/research-dataset.csv",
    NETWORK_URL: "https://example.com/dataset.csv",
    EMBEDDED_SECRET: "keychain://ai-research-lab/sk-proj-abcdefghijklmnopqrstuvwxyz012345"
} as const;

describe("CapabilityResourceReferenceSchema", () => {
    it("accepts only explicit opaque resource schemes", () => {
        for (const reference of Object.values(SafeCapabilityReference)) {
            expect(CapabilityResourceReferenceSchema.parse(` ${reference} `)).toBe(reference);
        }
    });

    it("rejects raw secrets and arbitrary plaintext", () => {
        for (const reference of Object.values(UnsafeCapabilityReference)) {
            expect(() => CapabilityResourceReferenceSchema.parse(reference)).toThrow();
        }
    });

    it("rejects credential material hidden behind an allowed scheme", () => {
        expect(() =>
            CapabilityResourceReferenceSchema.parse("dataset://user:password@independent/v1")
        ).toThrow("credential payload");
        expect(() =>
            CapabilityResourceReferenceSchema.parse("dataset://independent/v1?api_key=secret")
        ).toThrow("credential payload");
    });
});
