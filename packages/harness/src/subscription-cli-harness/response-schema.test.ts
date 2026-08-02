import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { HarnessProtocolError } from "#src/cli-execution/harness-error";
import {
    parseStructuredOutput,
    responseJsonSchema
} from "#src/subscription-cli-harness/response-schema";

const SourcesSchema = z.object({
    sources: z.array(z.object({ url: z.url() }))
});

describe("responseJsonSchema", () => {
    it("hands the CLI a draft-07 document that carries the string format", () => {
        expect(responseJsonSchema(SourcesSchema)).toMatchObject({
            $schema: "http://json-schema.org/draft-07/schema#",
            properties: {
                sources: {
                    items: {
                        properties: { url: { type: "string", format: "uri" } }
                    }
                }
            }
        });
    });
});

describe("parseStructuredOutput", () => {
    it("returns output that satisfies the schema", () => {
        const value = { sources: [{ url: "https://example.com/report" }] };

        expect(parseStructuredOutput(HarnessKinds.GLM, value, SourcesSchema)).toEqual(value);
    });

    it("enforces the declared format instead of ignoring it", () => {
        const value = { sources: [{ url: "not a uri" }] };

        expect(() => parseStructuredOutput(HarnessKinds.GLM, value, SourcesSchema)).toThrow(
            HarnessProtocolError
        );
        expect(() => parseStructuredOutput(HarnessKinds.GLM, value, SourcesSchema)).toThrow(
            "/sources/0/url"
        );
    });

    it("applies the schema's defaults so a run never sees an absent optional field", () => {
        const schema = z.object({ notes: z.array(z.string()).default([]) });

        expect(parseStructuredOutput(HarnessKinds.GLM, {}, schema)).toEqual({ notes: [] });
    });
});
