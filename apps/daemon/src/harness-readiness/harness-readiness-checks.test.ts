import { HarnessAuthenticationMethods } from "@lab/harness/agent-harness.const";
import type { HarnessPreflight } from "@lab/harness/agent-harness.types";
import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@lab/protocol/harness-readiness/harness-readiness.const";
import { describe, expect, it } from "vitest";
import {
    harnessNotInstalled,
    harnessNotSignedIn,
    harnessSignedIn,
    StubHarness
} from "#src/agent-harness/agent-harness.fixture";
import { HarnessReadinessChecks } from "#src/harness-readiness/harness-readiness-checks";

const CHECKED_AT = Date.parse("2026-08-05T09:00:00.000Z");
const CODEX_VERSION = "codex-cli 0.146.0";
const CODEX_PLAN = "ChatGPT Pro";

function checksOf(harnesses: Partial<Record<AgentHarnessKind, StubHarness>>) {
    return new HarnessReadinessChecks({
        createHarness: (kind) => harnesses[kind] ?? harnessNotInstalled(kind),
        now: () => CHECKED_AT
    });
}

describe("HarnessReadinessChecks", () => {
    it("proves a ready harness with the version and plan that answered", async () => {
        const checks = checksOf({
            [AgentHarnessKind.CODEX]: harnessSignedIn(
                AgentHarnessKind.CODEX,
                CODEX_VERSION,
                CODEX_PLAN
            )
        });

        await expect(checks.check(AgentHarnessKind.CODEX)).resolves.toEqual({
            harness: AgentHarnessKind.CODEX,
            state: HarnessReadinessState.READY,
            cli_version: CODEX_VERSION,
            plan: CODEX_PLAN,
            error: null,
            checked_at: "2026-08-05T09:00:00.000Z"
        });
    });

    /** Install it or sign it in are different jobs, and the page sends the operator to one of them. */
    it("separates a CLI that is missing from one that is signed in the wrong way", async () => {
        const checks = checksOf({
            [AgentHarnessKind.CODEX]: harnessNotInstalled(AgentHarnessKind.CODEX),
            [AgentHarnessKind.CLAUDE]: harnessNotSignedIn(AgentHarnessKind.CLAUDE)
        });

        const roster = await checks.checkAll();

        expect(roster).toContainEqual(
            expect.objectContaining({
                harness: AgentHarnessKind.CODEX,
                state: HarnessReadinessState.NOT_INSTALLED
            })
        );
        expect(roster).toContainEqual(
            expect.objectContaining({
                harness: AgentHarnessKind.CLAUDE,
                state: HarnessReadinessState.NOT_SIGNED_IN
            })
        );
    });

    /**
     * A check that broke for a reason nobody has a card for is reported as unread rather than as a
     * missing install: sending an operator to reinstall a CLI they already have wastes the one
     * minute they came here to spend.
     */
    it("reports a check that failed for an unrecognised reason without blaming the install", async () => {
        const timedOut = "glm harness preflight timed out after 30000 ms";
        const checks = checksOf({
            [AgentHarnessKind.GLM]: new StubHarness(AgentHarnessKind.GLM, () =>
                Promise.reject(new Error(timedOut))
            )
        });

        await expect(checks.check(AgentHarnessKind.GLM)).resolves.toMatchObject({
            state: HarnessReadinessState.UNREADABLE,
            error: timedOut
        });
    });

    /** Each check launches CLIs, so a second tab polling costs nothing beyond the first. */
    it("joins callers arriving together onto one conversation with the CLI", async () => {
        const held = Promise.withResolvers<HarnessPreflight>();
        const harness = new StubHarness(AgentHarnessKind.CODEX, () => held.promise);
        const checks = checksOf({ [AgentHarnessKind.CODEX]: harness });

        const first = checks.check(AgentHarnessKind.CODEX);
        const second = checks.check(AgentHarnessKind.CODEX);
        held.resolve({
            kind: AgentHarnessKind.CODEX,
            cliVersion: CODEX_VERSION,
            authentication: {
                method: HarnessAuthenticationMethods.CHATGPT,
                subscription: CODEX_PLAN
            }
        });
        await Promise.all([first, second]);

        expect(harness.preflights).toBe(1);
    });

    /** The next check is the operator asking whether the install they just did took. */
    it("asks the CLI again once the check before it has answered", async () => {
        const harness = harnessSignedIn(AgentHarnessKind.CODEX, CODEX_VERSION, CODEX_PLAN);
        const checks = checksOf({ [AgentHarnessKind.CODEX]: harness });

        await checks.check(AgentHarnessKind.CODEX);
        await checks.check(AgentHarnessKind.CODEX);

        expect(harness.preflights).toBe(2);
    });
});
