const ForbiddenEnvironmentVariable = {
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
    OPENAI_API_BASE: "OPENAI_API_BASE",
    OPENAI_API_KEY: "OPENAI_API_KEY",
    OPENAI_BASE_URL: "OPENAI_BASE_URL"
} as const;

const ForbiddenEnvironmentPrefix = {
    ANTHROPIC: "ANTHROPIC_",
    OPENAI: "OPENAI_",
    CODEX_API: "CODEX_API_",
    CODEX_BASE: "CODEX_BASE_",
    CODEX_MODEL_PROVIDER: "CODEX_MODEL_PROVIDER_",
    CLAUDE_CODE_API: "CLAUDE_CODE_API_",
    CLAUDE_CODE_USE: "CLAUDE_CODE_USE_"
} as const;

const forbiddenEnvironmentVariables: ReadonlySet<string> = new Set(
    Object.values(ForbiddenEnvironmentVariable)
);
const forbiddenEnvironmentPrefixes = Object.values(ForbiddenEnvironmentPrefix);

export function sanitizeHarnessEnvironment(
    source: Readonly<NodeJS.ProcessEnv> = process.env
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(source).filter(
            (entry): entry is [string, string] =>
                entry[1] !== undefined && !isForbiddenHarnessEnvironmentVariable(entry[0])
        )
    );
}

export function removedHarnessEnvironmentVariables(
    source: Readonly<NodeJS.ProcessEnv> = process.env
): readonly string[] {
    return Object.keys(source).filter(isForbiddenHarnessEnvironmentVariable).sort();
}

export function isForbiddenHarnessEnvironmentVariable(name: string): boolean {
    return (
        forbiddenEnvironmentVariables.has(name) ||
        forbiddenEnvironmentPrefixes.some((prefix) => name.startsWith(prefix))
    );
}
