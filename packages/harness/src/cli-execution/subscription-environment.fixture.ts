export function testEnvironment(): NodeJS.ProcessEnv {
    return {
        PATH: "/test/bin",
        HOME: "/test/home",
        CODEX_HOME: "/test/codex-home",
        OPENAI_API_KEY: "openai-secret",
        OPENAI_BASE_URL: "https://usage-billed.invalid",
        CODEX_API_KEY: "codex-secret",
        ANTHROPIC_API_KEY: "anthropic-secret",
        ANTHROPIC_AUTH_TOKEN: "anthropic-token",
        ANTHROPIC_BASE_URL: "https://usage-billed.invalid",
        CLAUDE_CODE_OAUTH_TOKEN: "oauth-token",
        CLAUDE_CODE_USE_BEDROCK: "1",
        CLAUDE_CODE_USE_VERTEX: "1",
        CLAUDE_CODE_USE_FOUNDRY: "1"
    };
}
