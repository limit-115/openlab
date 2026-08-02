import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { evaluateModelApiToolInput } from "#src/model-api-policy/model-api-policy";
import {
    ModelApiPolicyDecision,
    ModelApiPolicyHookEvent,
    ModelApiPolicyToolName
} from "#src/model-api-policy/model-api-policy.const";
import { ForbiddenFixture, hookInput } from "#src/model-api-policy/model-api-policy.fixture";
import { modelApiPolicyHookCommand } from "#src/model-api-policy/model-api-policy-hook";

const HOOK_DENY_EXIT_CODE = 2;

const parityCases: readonly (readonly [string, unknown])[] = [
    ["an ordinary local command", hookInput(ModelApiPolicyToolName.BASH, { command: "pnpm test" })],
    [
        "a provider endpoint fetch",
        hookInput(ModelApiPolicyToolName.WEB_FETCH, { url: ForbiddenFixture.OPENAI_ENDPOINT })
    ],
    [
        "a credential path read",
        hookInput(ModelApiPolicyToolName.READ, {
            file_path: ForbiddenFixture.CODEX_CREDENTIAL_PATH
        })
    ],
    [
        "a nested harness invocation",
        hookInput(ModelApiPolicyToolName.BASH, { command: "codex exec --json -" })
    ],
    [
        "an SDK install command",
        hookInput(ModelApiPolicyToolName.BASH, { command: "pnpm add @anthropic-ai/sdk" })
    ],
    [
        "SDK integration code written to disk",
        hookInput(ModelApiPolicyToolName.WRITE, {
            file_path: "client.ts",
            content: 'import OpenAI from "openai";'
        })
    ],
    [
        "an SDK import reaching a write tool that only the pattern list catches",
        hookInput(ModelApiPolicyToolName.EDIT, {
            file_path: "client.ts",
            new_string: 'require("@anthropic-ai/sdk")'
        })
    ],
    [
        "a payload with no tool_input at all",
        {
            hook_event_name: ModelApiPolicyHookEvent.PRE_TOOL_USE,
            tool_name: ModelApiPolicyToolName.BASH
        }
    ],
    ["a payload with a null tool_input", hookInput(ModelApiPolicyToolName.BASH, null)],
    ["a payload with a string tool_input", hookInput(ModelApiPolicyToolName.BASH, "not-an-object")],
    ["an empty payload", {}],
    [
        "a payload for the wrong hook event",
        { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: {} }
    ],
    [
        "a payload with a non-string tool name",
        { hook_event_name: ModelApiPolicyHookEvent.PRE_TOOL_USE, tool_name: 7, tool_input: {} }
    ]
];

async function inlineHookDecision(input: unknown): Promise<ModelApiPolicyDecision> {
    const result = await execa("/bin/sh", ["-c", modelApiPolicyHookCommand()], {
        input: JSON.stringify(input),
        reject: false
    });
    return result.exitCode === HOOK_DENY_EXIT_CODE
        ? ModelApiPolicyDecision.DENY
        : ModelApiPolicyDecision.ALLOW;
}

describe("model API policy implementation parity", () => {
    it.each(parityCases)(
        "reaches the same verdict in process and in the CLI hook for %s",
        async (_label, input) => {
            const inProcess = evaluateModelApiToolInput(input).decision;
            const inHook = await inlineHookDecision(input);

            expect(inHook).toBe(inProcess);
        }
    );
});
