export const ForbiddenEnvironmentVariable = {
    ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
    ANTHROPIC_AUTH_TOKEN: "ANTHROPIC_AUTH_TOKEN",
    ANTHROPIC_BASE_URL: "ANTHROPIC_BASE_URL",
    ANTHROPIC_BEDROCK_BASE_URL: "ANTHROPIC_BEDROCK_BASE_URL",
    ANTHROPIC_FOUNDRY_API_KEY: "ANTHROPIC_FOUNDRY_API_KEY",
    ANTHROPIC_FOUNDRY_BASE_URL: "ANTHROPIC_FOUNDRY_BASE_URL",
    ANTHROPIC_VERTEX_PROJECT_ID: "ANTHROPIC_VERTEX_PROJECT_ID",
    CLAUDE_CODE_OAUTH_TOKEN: "CLAUDE_CODE_OAUTH_TOKEN",
    CLAUDE_CODE_USE_BEDROCK: "CLAUDE_CODE_USE_BEDROCK",
    CLAUDE_CODE_USE_FOUNDRY: "CLAUDE_CODE_USE_FOUNDRY",
    CLAUDE_CODE_USE_VERTEX: "CLAUDE_CODE_USE_VERTEX",
    CODEX_API_KEY: "CODEX_API_KEY",
    CODEX_BASE_URL: "CODEX_BASE_URL",
    META_API_KEY: "META_API_KEY",
    OPENAI_API_BASE: "OPENAI_API_BASE",
    OPENAI_API_KEY: "OPENAI_API_KEY",
    OPENAI_BASE_URL: "OPENAI_BASE_URL"
} as const;

export const ForbiddenEnvironmentPrefix = {
    ANTHROPIC: "ANTHROPIC_",
    OPENAI: "OPENAI_",
    CODEX_API: "CODEX_API_",
    CODEX_BASE: "CODEX_BASE_",
    CODEX_MODEL_PROVIDER: "CODEX_MODEL_PROVIDER_",
    CLAUDE_CODE_API: "CLAUDE_CODE_API_",
    CLAUDE_CODE_USE: "CLAUDE_CODE_USE_",
    META: "META_",
    /**
     * `muse` on the path is a launcher, and these move where it downloads its binary from, where it
     * sends a login, and which client id it logs in as. A run inheriting one from the operator's
     * shell would be a different program talking to a different host under the same name.
     */
    MUSE: "MUSE_"
} as const;
