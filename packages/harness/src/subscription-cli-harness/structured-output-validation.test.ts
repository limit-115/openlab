import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { HarnessProtocolError, HarnessRequestError } from "#src/cli-execution/harness-error";
import { validateStructuredOutput } from "#src/subscription-cli-harness/structured-output-validation";

// Zod's z.url() emits { type: "string", format: "uri" }; the researcher output schema carries it.
const schemaWithUriFormat = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
        sources: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    url: { type: "string", format: "uri" }
                },
                required: ["url"],
                additionalProperties: false
            }
        }
    },
    required: ["sources"],
    additionalProperties: false
};

describe("validateStructuredOutput", () => {
    it("compiles a schema that declares a standard string format and returns valid output", () => {
        const value = { sources: [{ url: "https://example.com/report" }] };

        expect(validateStructuredOutput(HarnessKinds.GLM, value, schemaWithUriFormat)).toBe(value);
    });

    it("enforces the declared format instead of ignoring it", () => {
        const value = { sources: [{ url: "not a uri" }] };

        expect(() =>
            validateStructuredOutput(HarnessKinds.GLM, value, schemaWithUriFormat)
        ).toThrow(HarnessProtocolError);
        expect(() =>
            validateStructuredOutput(HarnessKinds.GLM, value, schemaWithUriFormat)
        ).toThrow(/format "uri"/);
    });

    it("still rejects a schema that uses a genuinely unknown keyword", () => {
        const invalidSchema = {
            type: "object",
            properties: { name: { type: "string" } },
            notARealKeyword: true
        };

        expect(() =>
            validateStructuredOutput(HarnessKinds.GLM, { name: "x" }, invalidSchema)
        ).toThrow(HarnessRequestError);
        expect(() =>
            validateStructuredOutput(HarnessKinds.GLM, { name: "x" }, invalidSchema)
        ).toThrow("The requested response schema is invalid");
    });
});
