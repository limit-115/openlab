import { z } from "zod";
import {
    BASH_FORBIDDEN_MODEL_API_PATTERNS,
    ForbiddenModelApiPattern,
    MODEL_API_POLICY_WRITE_TOOLS,
    ModelApiPolicyDecision,
    ModelApiPolicyDenialReason,
    ModelApiPolicyHookEvent,
    ModelApiPolicyToolName,
    UNIVERSAL_FORBIDDEN_MODEL_API_PATTERNS
} from "#src/model-api-policy/model-api-policy.const";
import type { ModelApiPolicyResult } from "#src/model-api-policy/model-api-policy.types";

const HookInputSchema = z.looseObject({
    hook_event_name: z.literal(ModelApiPolicyHookEvent.PRE_TOOL_USE),
    tool_name: z.string().min(1),
    tool_input: z.unknown()
});

const writeToolNames: readonly string[] = MODEL_API_POLICY_WRITE_TOOLS;

export function evaluateModelApiToolInput(input: unknown): ModelApiPolicyResult {
    const parsed = HookInputSchema.safeParse(input);
    if (!parsed.success) {
        return deny(ModelApiPolicyDenialReason.MALFORMED_INPUT);
    }

    const serializedInput = JSON.stringify(parsed.data.tool_input);
    const universalViolation = firstViolation(
        serializedInput,
        UNIVERSAL_FORBIDDEN_MODEL_API_PATTERNS
    );
    if (universalViolation) {
        return deny(ModelApiPolicyDenialReason.PROVIDER_ACCESS);
    }

    if (parsed.data.tool_name === ModelApiPolicyToolName.BASH) {
        const command = toolStringField(parsed.data.tool_input, "command");
        if (firstViolation(command, BASH_FORBIDDEN_MODEL_API_PATTERNS)) {
            return deny(ModelApiPolicyDenialReason.NESTED_HARNESS);
        }
    }

    if (writeToolNames.includes(parsed.data.tool_name)) {
        if (ForbiddenModelApiPattern.MODEL_SDK_IMPORT.test(serializedInput)) {
            return deny(ModelApiPolicyDenialReason.SDK_INTEGRATION_CODE);
        }
    }

    return { decision: ModelApiPolicyDecision.ALLOW };
}

export function evaluateModelApiCommand(
    file: string,
    args: readonly string[]
): ModelApiPolicyResult {
    return evaluateModelApiToolInput({
        hook_event_name: ModelApiPolicyHookEvent.PRE_TOOL_USE,
        tool_name: ModelApiPolicyToolName.BASH,
        tool_input: { command: [file, ...args].join(" ") }
    });
}

function firstViolation(value: string, patterns: readonly RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(value));
}

function toolStringField(input: unknown, field: string): string {
    if (typeof input !== "object" || input === null || !(field in input)) {
        return "";
    }
    const value = (input as Record<string, unknown>)[field];
    return typeof value === "string" ? value : "";
}

function deny(reason: string): ModelApiPolicyResult {
    return { decision: ModelApiPolicyDecision.DENY, reason };
}
