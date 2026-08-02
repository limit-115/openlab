import { execa } from "execa";
import { describe, expect, it } from "vitest";
import {
    ModelApiPolicyHookEvent,
    ModelApiPolicyToolName
} from "#src/model-api-policy/model-api-policy.const";
import { ForbiddenFixture, hookInput } from "#src/model-api-policy/model-api-policy.fixture";
import {
    claudeModelApiPolicySettings,
    codexModelApiPolicyConfig,
    modelApiPolicyHookCommand
} from "#src/model-api-policy/model-api-policy-hook";

describe("model API policy CLI hook", () => {
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
