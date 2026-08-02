import { Ajv, type ErrorObject } from "ajv";
import { InvalidProviderOutputError, ProviderError } from "#src/errors";

const ajv = new Ajv({
    allErrors: true,
    strictSchema: true
});

export function validateStructuredOutput(
    content: string,
    schema: Readonly<Record<string, unknown>>,
    provider: string
): unknown {
    let value: unknown;

    try {
        value = JSON.parse(content);
    } catch (error) {
        throw new InvalidProviderOutputError(
            provider,
            `${provider} returned malformed JSON for a structured response`,
            [error instanceof Error ? error.message : "JSON parsing failed"],
            error
        );
    }

    let validate: ReturnType<typeof ajv.compile>;
    try {
        validate = ajv.compile(schema);
    } catch (error) {
        throw new ProviderError("invalid_request", "The requested response schema is invalid", {
            provider,
            cause: error
        });
    }

    if (!validate(value)) {
        const details = validate.errors?.map((error: ErrorObject) => {
            const path = error.instancePath || "/";
            return `${path} ${error.message ?? "is invalid"}`;
        }) ?? ["The response did not match the requested schema"];

        throw new InvalidProviderOutputError(
            provider,
            `${provider} returned JSON that does not match the requested schema`,
            details
        );
    }

    return value;
}
