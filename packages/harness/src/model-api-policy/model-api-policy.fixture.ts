import {
    ModelApiPolicyHookEvent,
    type ModelApiPolicyToolName
} from "#src/model-api-policy/model-api-policy.const";

export const ForbiddenFixture = {
    OPENAI_ENDPOINT: "https://api.openai.com/v1/responses",
    PROVIDER_SECRET: "sk-proj-abcdefghijklmnopqrstuvwxyz",
    CODEX_CREDENTIAL_PATH: "/Users/operator/.codex/auth.json"
} as const;

export function hookInput(
    toolName: ModelApiPolicyToolName,
    toolInput: unknown
): Record<string, unknown> {
    return {
        hook_event_name: ModelApiPolicyHookEvent.PRE_TOOL_USE,
        tool_name: toolName,
        tool_input: toolInput
    };
}
