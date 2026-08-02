import { execa } from "execa";
import { describe, expect, it } from "vitest";
import {
    claudeModelApiPolicySettings,
    codexModelApiPolicyConfig,
    evaluateModelApiToolInput,
    ModelApiPolicyDecision,
    ModelApiPolicyHookEvent,
    ModelApiPolicyToolName,
    type ModelApiPolicyToolName as ModelApiPolicyToolNameValue,
    modelApiPolicyHookCommand
} from "#src/model-api-policy";

const ForbiddenFixture = {
    OPENAI_ENDPOINT: "https://api.openai.com/v1/responses",
    PROVIDER_SECRET: "sk-proj-abcdefghijklmnopqrstuvwxyz",
    CODEX_CREDENTIAL_PATH: "/Users/operator/.codex/auth.json"
} as const;

describe("model API PreToolUse policy", () => {
    it("allows ordinary local research commands", () => {
        expect(
            evaluateModelApiToolInput(
                hookInput(ModelApiPolicyToolName.BASH, { command: "pnpm test" })
            )
        ).toEqual({ decision: ModelApiPolicyDecision.ALLOW });
    });

    it.each([
        `curl ${ForbiddenFixture.OPENAI_ENDPOINT}`,
        "printenv OPENAI_API_KEY",
        "pnpm add @anthropic-ai/sdk",
        "uv pip install openai",
        "node -e 'import OpenAI from \"openai\"'",
        "codex exec --json -",
        "env claude -p 'nested model call'"
    ])("denies forbidden Bash tool input before execution: %s", (command) => {
        expect(
            evaluateModelApiToolInput(hookInput(ModelApiPolicyToolName.BASH, { command }))
        ).toMatchObject({ decision: ModelApiPolicyDecision.DENY });
    });

    it("denies provider credential reads and writes", () => {
        expect(
            evaluateModelApiToolInput(
                hookInput(ModelApiPolicyToolName.READ, {
                    file_path: ForbiddenFixture.CODEX_CREDENTIAL_PATH
                })
            )
        ).toMatchObject({ decision: ModelApiPolicyDecision.DENY });
        expect(
            evaluateModelApiToolInput(
                hookInput(ModelApiPolicyToolName.WRITE, {
                    file_path: "client.ts",
                    content: `const token = "${ForbiddenFixture.PROVIDER_SECRET}";`
                })
            )
        ).toMatchObject({ decision: ModelApiPolicyDecision.DENY });
    });

    it("fails closed for malformed hook input", () => {
        expect(evaluateModelApiToolInput({})).toMatchObject({
            decision: ModelApiPolicyDecision.DENY
        });
    });

    it("builds blocking policy settings for both subscription CLIs", () => {
        expect(codexModelApiPolicyConfig()).toContain("hooks.PreToolUse");
        const claudeSettings = JSON.parse(claudeModelApiPolicySettings());
        expect(claudeSettings).toMatchObject({
            hooks: {
                [ModelApiPolicyHookEvent.PRE_TOOL_USE]: [
                    {
                        matcher: ".*",
                        hooks: [{ type: "command", timeout: 5 }]
                    }
                ]
            }
        });
    });

    it("exits with the blocking code expected by Codex and Claude", async () => {
        const result = await execa("/bin/sh", ["-c", modelApiPolicyHookCommand()], {
            input: JSON.stringify(
                hookInput(ModelApiPolicyToolName.WEB_FETCH, {
                    url: ForbiddenFixture.OPENAI_ENDPOINT
                })
            ),
            reject: false
        });

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain("forbidden");
    });
});

function hookInput(
    toolName: ModelApiPolicyToolNameValue,
    toolInput: unknown
): Record<string, unknown> {
    return {
        hook_event_name: ModelApiPolicyHookEvent.PRE_TOOL_USE,
        tool_name: toolName,
        tool_input: toolInput
    };
}
