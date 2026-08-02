import { Ajv, type ErrorObject } from "ajv";
import type { HarnessKind } from "#src/contract";
import { HarnessProtocolError, HarnessRequestError } from "#src/errors";

const ajv = new Ajv({
    allErrors: true,
    strictSchema: true
});

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
