const FORBIDDEN_ENVIRONMENT_VARIABLES = new Set([
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_FOUNDRY_API_KEY",
    "ANTHROPIC_FOUNDRY_BASE_URL",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_FOUNDRY",
    "CLAUDE_CODE_USE_VERTEX",
    "CODEX_API_KEY",
    "CODEX_BASE_URL",
    "OPENAI_API_BASE",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL"
]);

const FORBIDDEN_PREFIXES = [
    "ANTHROPIC_",
    "OPENAI_",
    "CODEX_API_",
    "CODEX_BASE_",
    "CODEX_MODEL_PROVIDER_",
    "CLAUDE_CODE_API_",
    "CLAUDE_CODE_USE_"
];

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
        FORBIDDEN_ENVIRONMENT_VARIABLES.has(name) ||
        FORBIDDEN_PREFIXES.some((prefix) => name.startsWith(prefix))
    );
}
