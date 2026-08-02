import { describe, expect, it } from "vitest";
import {
    isForbiddenHarnessEnvironmentVariable,
    removedHarnessEnvironmentVariables,
    sanitizeHarnessEnvironment
} from "#src/cli-execution/subscription-environment";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";

describe("subscription environment isolation", () => {
    it("strips model API credentials and billing routes while retaining local CLI auth state", () => {
        const environment = testEnvironment();
        const sanitized = sanitizeHarnessEnvironment(environment);

        expect(sanitized).toEqual({
            PATH: "/test/bin",
            CODEX_HOME: "/test/codex-home",
            HOME: "/test/home"
        });
        expect(removedHarnessEnvironmentVariables(environment)).toEqual([
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_AUTH_TOKEN",
            "ANTHROPIC_BASE_URL",
            "CLAUDE_CODE_OAUTH_TOKEN",
            "CLAUDE_CODE_USE_BEDROCK",
            "CLAUDE_CODE_USE_FOUNDRY",
            "CLAUDE_CODE_USE_VERTEX",
            "CODEX_API_KEY",
            "OPENAI_API_KEY",
            "OPENAI_BASE_URL"
        ]);
        expect(isForbiddenHarnessEnvironmentVariable("OPENAI_API_FUTURE_ROUTE")).toBe(true);
        expect(isForbiddenHarnessEnvironmentVariable("CODEX_HOME")).toBe(false);
    });
});
