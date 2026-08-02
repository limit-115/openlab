import { z } from "zod";

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

const ForbiddenModelApiPattern = {
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

const HookInputSchema = z
    .object({
        hook_event_name: z.literal(ModelApiPolicyHookEvent.PRE_TOOL_USE),
        tool_name: z.string().min(1),
        tool_input: z.unknown()
    })
    .passthrough();

export interface ModelApiPolicyResult {
    readonly decision: ModelApiPolicyDecision;
    readonly reason?: string;
}

export function evaluateModelApiToolInput(input: unknown): ModelApiPolicyResult {
    const parsed = HookInputSchema.safeParse(input);
    if (!parsed.success) {
        return deny("Malformed PreToolUse input was rejected by the model API policy");
    }

    const serializedInput = JSON.stringify(parsed.data.tool_input);
    const universalViolation = firstViolation(serializedInput, [
        ForbiddenModelApiPattern.PROVIDER_ENDPOINT,
        ForbiddenModelApiPattern.PROVIDER_CREDENTIAL,
        ForbiddenModelApiPattern.PROVIDER_CREDENTIAL_PATH,
        ForbiddenModelApiPattern.RAW_PROVIDER_SECRET
    ]);
    if (universalViolation) {
        return deny("Direct model endpoint or provider credential access is forbidden");
    }

    if (parsed.data.tool_name === ModelApiPolicyToolName.BASH) {
        const command = toolStringField(parsed.data.tool_input, "command");
        if (
            firstViolation(command, [
                ForbiddenModelApiPattern.MODEL_SDK_IMPORT,
                ForbiddenModelApiPattern.MODEL_SDK_INSTALL,
                ForbiddenModelApiPattern.NESTED_MODEL_HARNESS
            ])
        ) {
            return deny("Only the daemon may invoke subscription CLI harnesses or model clients");
        }
    }

    if (
        parsed.data.tool_name === ModelApiPolicyToolName.WRITE ||
        parsed.data.tool_name === ModelApiPolicyToolName.EDIT ||
        parsed.data.tool_name === ModelApiPolicyToolName.APPLY_PATCH
    ) {
        if (ForbiddenModelApiPattern.MODEL_SDK_IMPORT.test(serializedInput)) {
            return deny("Writing model-provider SDK integration code is forbidden");
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

export function modelApiPolicyHookCommand(): string {
    return [process.execPath, "--input-type=module", "--eval", inlinePolicySource()]
        .map(shellQuote)
        .join(" ");
}

export function codexModelApiPolicyConfig(): string {
    const command = JSON.stringify(modelApiPolicyHookCommand());
    return `hooks.PreToolUse=[{ matcher = ".*", hooks = [{ type = "command", command = ${command}, timeout = 5 }] }]`;
}

export function claudeModelApiPolicySettings(): string {
    return JSON.stringify({
        hooks: {
            [ModelApiPolicyHookEvent.PRE_TOOL_USE]: [
                {
                    matcher: ".*",
                    hooks: [
                        {
                            type: "command",
                            command: modelApiPolicyHookCommand(),
                            timeout: 5
                        }
                    ]
                }
            ]
        }
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

function shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function inlinePolicySource(): string {
    const policy = {
        event: ModelApiPolicyHookEvent.PRE_TOOL_USE,
        bash: ModelApiPolicyToolName.BASH,
        writeTools: [
            ModelApiPolicyToolName.WRITE,
            ModelApiPolicyToolName.EDIT,
            ModelApiPolicyToolName.APPLY_PATCH
        ],
        universalPatterns: patternSpecifications([
            ForbiddenModelApiPattern.PROVIDER_ENDPOINT,
            ForbiddenModelApiPattern.PROVIDER_CREDENTIAL,
            ForbiddenModelApiPattern.PROVIDER_CREDENTIAL_PATH,
            ForbiddenModelApiPattern.RAW_PROVIDER_SECRET
        ]),
        bashPatterns: patternSpecifications([
            ForbiddenModelApiPattern.MODEL_SDK_IMPORT,
            ForbiddenModelApiPattern.MODEL_SDK_INSTALL,
            ForbiddenModelApiPattern.NESTED_MODEL_HARNESS
        ]),
        writePatterns: patternSpecifications([ForbiddenModelApiPattern.MODEL_SDK_IMPORT])
    } as const;
    return `
const policy = ${JSON.stringify(policy)};
const deny = (reason) => {
    process.stderr.write(reason + "\\n");
    process.exitCode = 2;
};
try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (input?.hook_event_name !== policy.event || typeof input?.tool_name !== "string") {
        deny("Malformed PreToolUse input was rejected by the model API policy");
    } else {
        const serialized = JSON.stringify(input.tool_input);
        const matches = (patterns, value) => patterns.some(([source, flags]) => new RegExp(source, flags).test(value));
        const command = typeof input.tool_input?.command === "string" ? input.tool_input.command : "";
        if (matches(policy.universalPatterns, serialized)) {
            deny("Direct model endpoint or provider credential access is forbidden");
        } else if (input.tool_name === policy.bash && matches(policy.bashPatterns, command)) {
            deny("Only the daemon may invoke subscription CLI harnesses or model clients");
        } else if (policy.writeTools.includes(input.tool_name) && matches(policy.writePatterns, serialized)) {
            deny("Writing model-provider SDK integration code is forbidden");
        }
    }
} catch (error) {
    deny("Model API policy failed closed: " + (error instanceof Error ? error.message : String(error)));
}
`.trim();
}

function patternSpecifications(
    patterns: readonly RegExp[]
): readonly (readonly [string, string])[] {
    return patterns.map((pattern) => [pattern.source, pattern.flags] as const);
}
