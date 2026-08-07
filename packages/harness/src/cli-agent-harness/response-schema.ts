import { z } from "zod";
import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import { HarnessProtocolError } from "#src/cli-execution/harness-error";

/** The JSON Schema dialect every supported CLI accepts for its structured-output flag. */
const RESPONSE_SCHEMA_TARGET = "draft-7";

/** The schema document a CLI is handed, derived from the request's own response schema. */
export function responseJsonSchema(schema: z.ZodType): Readonly<Record<string, unknown>> {
    return z.toJSONSchema(schema, { target: RESPONSE_SCHEMA_TARGET }) as Readonly<
        Record<string, unknown>
    >;
}

/**
 * Checks a CLI's structured answer against the schema the run asked for. A mismatch is the CLI
 * breaking the structured-output protocol, so it surfaces as a protocol failure naming the fields
 * that disagreed rather than as an opaque rejection.
 */
export function parseStructuredOutput(
    harness: HarnessKind,
    value: unknown,
    schema: z.ZodType
): unknown {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw new HarnessProtocolError(
            harness,
            `Structured CLI output does not match the requested schema: ${schemaMismatch(parsed.error)}`
        );
    }

    return parsed.data;
}

function schemaMismatch(error: z.ZodError): string {
    return error.issues.map((issue) => `/${issue.path.join("/")} ${issue.message}`).join("; ");
}
