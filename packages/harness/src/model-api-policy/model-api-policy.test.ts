import { describe, expect, it } from "vitest";
import { evaluateModelApiToolInput } from "#src/model-api-policy/model-api-policy";
import {
    ModelApiPolicyDecision,
    ModelApiPolicyToolName
} from "#src/model-api-policy/model-api-policy.const";
import { ForbiddenFixture, hookInput } from "#src/model-api-policy/model-api-policy.fixture";

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
});
