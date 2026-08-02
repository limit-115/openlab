import { Ajv, type ErrorObject } from "ajv";
import addFormatsPlugin from "ajv-formats";
import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import { HarnessProtocolError, HarnessRequestError } from "#src/cli-execution/harness-error";

// ajv-formats is CommonJS whose runtime `module.exports` is the plugin function, but its published
// types model that as an ESM default export. Under NodeNext that resolves to the module namespace
// rather than the callable, so bridge the binding to its true call signature.
const addFormats = addFormatsPlugin as unknown as (instance: Ajv) => Ajv;

const ajv = new Ajv({
    allErrors: true,
    strictSchema: true
});
// Zod emits standard JSON Schema `format` values (uri, email, uuid, date-time). Without a format
// implementation, strict mode rejects them at compile time, so register the standard formats.
addFormats(ajv);

export function validateStructuredOutput(
    harness: HarnessKind,
    value: unknown,
    schema: Readonly<Record<string, unknown>>
): unknown {
    let validate: ReturnType<typeof ajv.compile>;
    try {
        validate = ajv.compile(schema);
    } catch (error) {
        throw new HarnessRequestError(harness, "The requested response schema is invalid", {
            cause: error
        });
    }

    if (!validate(value)) {
        const details =
            validate.errors
                ?.map((error: ErrorObject) => {
                    const path = error.instancePath || "/";
                    return `${path} ${error.message ?? "is invalid"}`;
                })
                .join("; ") ?? "unknown schema mismatch";
        throw new HarnessProtocolError(
            harness,
            `Structured CLI output does not match the requested schema: ${details}`
        );
    }

    return value;
}
