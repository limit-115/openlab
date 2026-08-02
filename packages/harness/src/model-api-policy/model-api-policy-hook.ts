import {
    BASH_FORBIDDEN_MODEL_API_PATTERNS,
    MODEL_API_POLICY_WRITE_TOOLS,
    ModelApiPolicyDenialReason,
    ModelApiPolicyHookEvent,
    ModelApiPolicyToolName,
    UNIVERSAL_FORBIDDEN_MODEL_API_PATTERNS,
    WRITE_FORBIDDEN_MODEL_API_PATTERNS
} from "#src/model-api-policy/model-api-policy.const";

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

function shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function inlinePolicySource(): string {
    const policy = {
        event: ModelApiPolicyHookEvent.PRE_TOOL_USE,
        bash: ModelApiPolicyToolName.BASH,
        writeTools: MODEL_API_POLICY_WRITE_TOOLS,
        universalPatterns: patternSpecifications(UNIVERSAL_FORBIDDEN_MODEL_API_PATTERNS),
        bashPatterns: patternSpecifications(BASH_FORBIDDEN_MODEL_API_PATTERNS),
        writePatterns: patternSpecifications(WRITE_FORBIDDEN_MODEL_API_PATTERNS)
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
        deny(${JSON.stringify(ModelApiPolicyDenialReason.MALFORMED_INPUT)});
    } else {
        const serialized = JSON.stringify(input.tool_input);
        const matches = (patterns, value) => patterns.some(([source, flags]) => new RegExp(source, flags).test(value));
        const command = typeof input.tool_input?.command === "string" ? input.tool_input.command : "";
        if (matches(policy.universalPatterns, serialized)) {
            deny(${JSON.stringify(ModelApiPolicyDenialReason.PROVIDER_ACCESS)});
        } else if (input.tool_name === policy.bash && matches(policy.bashPatterns, command)) {
            deny(${JSON.stringify(ModelApiPolicyDenialReason.NESTED_HARNESS)});
        } else if (policy.writeTools.includes(input.tool_name) && matches(policy.writePatterns, serialized)) {
            deny(${JSON.stringify(ModelApiPolicyDenialReason.SDK_INTEGRATION_CODE)});
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
