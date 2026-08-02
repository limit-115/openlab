export const ModelApiPolicyDecision = {
    ALLOW: "allow",
    DENY: "deny"
} as const;
export type ModelApiPolicyDecision =
    (typeof ModelApiPolicyDecision)[keyof typeof ModelApiPolicyDecision];

export const ModelApiPolicyHookEvent = {
    PRE_TOOL_USE: "PreToolUse"
} as const;

export const ModelApiPolicyToolName = {
    BASH: "Bash",
    READ: "Read",
    WRITE: "Write",
    EDIT: "Edit",
    APPLY_PATCH: "apply_patch",
    WEB_FETCH: "WebFetch"
} as const;
export type ModelApiPolicyToolName =
    (typeof ModelApiPolicyToolName)[keyof typeof ModelApiPolicyToolName];

export const ModelApiPolicyDenialReason = {
    MALFORMED_INPUT: "Malformed PreToolUse input was rejected by the model API policy",
    PROVIDER_ACCESS: "Direct model endpoint or provider credential access is forbidden",
    NESTED_HARNESS: "Only the daemon may invoke subscription CLI harnesses or model clients",
    SDK_INTEGRATION_CODE: "Writing model-provider SDK integration code is forbidden"
} as const;

export const ForbiddenModelApiPattern = {
    PROVIDER_ENDPOINT:
        /(?:api\.openai\.com|api\.anthropic\.com|openai\.azure\.com|bedrock-runtime\.[\w.-]+\.amazonaws\.com|aiplatform\.googleapis\.com|generativelanguage\.googleapis\.com)/iu,
    PROVIDER_CREDENTIAL:
        /(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|ANTHROPIC_FOUNDRY_API_KEY|CODEX_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|AZURE_OPENAI_API_KEY)/u,
    PROVIDER_CREDENTIAL_PATH:
        /(?:\.codex[/\\](?:auth\.json|credentials)|\.claude[/\\](?:credentials|auth)|keychain[^\n]*(?:openai|anthropic|codex|claude))/iu,
    RAW_PROVIDER_SECRET:
        /(?:\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|\bBearer\s+[A-Za-z0-9._~+/-]{20,})/u,
    MODEL_SDK_IMPORT:
        /(?:from\s+["'](?:openai|@anthropic-ai\/sdk|anthropic|@google\/genai|google-generativeai|@aws-sdk\/client-bedrock-runtime)["']|(?:require|import)\s*\(\s*["'](?:openai|@anthropic-ai\/sdk|anthropic|@google\/genai|google-generativeai|@aws-sdk\/client-bedrock-runtime)["']\s*\)|(?:^|\s)(?:import|from)\s+(?:openai|anthropic)(?:\s|$))/imu,
    MODEL_SDK_INSTALL:
        /(?:(?:npm|pnpm|yarn|bun|pip|pipx)\s+(?:install|add|i)|uv\s+(?:pip\s+)?install)\b[^\n;&|]*(?:@anthropic-ai\/sdk|openai|anthropic|@google\/genai|google-generativeai|@aws-sdk\/client-bedrock-runtime)/iu,
    NESTED_MODEL_HARNESS:
        /(?:^|[\s'"`(=,;&|])(?:[^\s'"`;|()]*[/\\])?(?:codex|claude)(?:$|[\s'"`),;&|])/iu
} as const;

export const UNIVERSAL_FORBIDDEN_MODEL_API_PATTERNS = [
    ForbiddenModelApiPattern.PROVIDER_ENDPOINT,
    ForbiddenModelApiPattern.PROVIDER_CREDENTIAL,
    ForbiddenModelApiPattern.PROVIDER_CREDENTIAL_PATH,
    ForbiddenModelApiPattern.RAW_PROVIDER_SECRET
] as const;

export const BASH_FORBIDDEN_MODEL_API_PATTERNS = [
    ForbiddenModelApiPattern.MODEL_SDK_IMPORT,
    ForbiddenModelApiPattern.MODEL_SDK_INSTALL,
    ForbiddenModelApiPattern.NESTED_MODEL_HARNESS
] as const;

export const WRITE_FORBIDDEN_MODEL_API_PATTERNS = [
    ForbiddenModelApiPattern.MODEL_SDK_IMPORT
] as const;

export const MODEL_API_POLICY_WRITE_TOOLS = [
    ModelApiPolicyToolName.WRITE,
    ModelApiPolicyToolName.EDIT,
    ModelApiPolicyToolName.APPLY_PATCH
] as const;
