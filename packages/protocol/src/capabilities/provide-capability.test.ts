import { describe, expect, it } from "vitest";
import { ProvideCapabilitySchema } from "#src/capabilities/provide-capability.schema";

describe("ProvideCapabilitySchema", () => {
    it("accepts an opaque resource handle", () => {
        expect(
            ProvideCapabilitySchema.parse({
                resource_reference: " keychain://ai-research-lab/licensed-corpus "
            })
        ).toEqual({
            resource_reference: "keychain://ai-research-lab/licensed-corpus"
        });
    });

    it.each([
        "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
        "Bearer abcdefghijklmnopqrstuvwxyz012345",
        "a".repeat(96),
        "api-key: abcdefghijklmnopqrstuvwxyz"
    ])("rejects credential material instead of accepting %s", (resourceReference) => {
        expect(() =>
            ProvideCapabilitySchema.parse({ resource_reference: resourceReference })
        ).toThrow();
    });
});
