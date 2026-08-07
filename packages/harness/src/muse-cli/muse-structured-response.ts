import type { z } from "zod";
import { responseJsonSchema } from "#src/subscription-cli-harness/response-schema";

const JSON_FENCE = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/;

/**
 * Muse Code has no structured-output flag, so the schema is asked for in words. This is weaker than
 * what the other harnesses get and the difference is worth naming: Codex and Claude are handed the
 * schema as a document their runtime enforces, while Muse is asked and may decline. Nothing downstream
 * has to trust the difference — whatever comes back is still checked against the same Zod schema, so a
 * model that ignores the instruction fails the run as a protocol error rather than passing prose off
 * as an answer.
 */
export function museStructuredPrompt(prompt: string, responseSchema: z.ZodType): string {
    const schema = JSON.stringify(responseJsonSchema(responseSchema), null, 4);
    return `${prompt}

## Required answer format

Your final message must be exactly one JSON value matching this JSON Schema, and nothing else — no
prose before or after it, and no code fence:

${schema}`;
}

/**
 * Reads the answer out of the final message. A model asked for bare JSON usually sends bare JSON and
 * sometimes wraps it in a fence anyway, so both are read. Anything else is left unread rather than
 * guessed at: the run then fails saying the CLI returned no structured output, which is what happened.
 */
export function museStructuredCandidate(text: string): { found: boolean; value: unknown } {
    const trimmed = text.trim();
    const unfenced = JSON_FENCE.exec(trimmed)?.[1]?.trim() ?? trimmed;
    if (!unfenced) {
        return { found: false, value: undefined };
    }

    try {
        return { found: true, value: JSON.parse(unfenced) };
    } catch {
        return { found: false, value: undefined };
    }
}
