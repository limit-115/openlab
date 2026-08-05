import { HarnessKinds } from "@openlab/harness/agent-harness.const";
import type { SubscriptionAllowance as HarnessAllowance } from "@openlab/harness/subscription-allowance.types";
import { SubscriptionAllowanceState } from "@openlab/protocol/subscription-allowance/subscription-allowance.const";
import { describe, expect, it } from "vitest";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

const TTL_MILLISECONDS = 60_000;

function reading(windows: HarnessAllowance["windows"]): HarnessAllowance {
    return { kind: HarnessKinds.CLAUDE, plan: "max", windows };
}

describe("SubscriptionAllowanceReadings", () => {
    it("calls a plan spent on the window that ran out, however much the others have left", async () => {
        const readings = new SubscriptionAllowanceReadings({
            read: async () =>
                reading([
                    { durationMinutes: 300, usedPercent: 4, resetsAt: null },
                    { durationMinutes: 10_080, usedPercent: 100, resetsAt: null }
                ])
        });

        const allowance = await readings.read(HarnessKinds.CLAUDE);

        expect(allowance.state).toBe(SubscriptionAllowanceState.EXHAUSTED);
        expect(allowance.plan).toBe("max");
    });

    it("reports a vendor that could not be asked as unread rather than spent", async () => {
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                throw new Error("No Keychain entry");
            }
        });

        const allowance = await readings.read(HarnessKinds.CLAUDE);

        expect(allowance.state).toBe(SubscriptionAllowanceState.UNREADABLE);
        expect(allowance.error).toBe("No Keychain entry");
        expect(allowance.windows).toHaveLength(0);
    });

    it("asks a vendor once per interval however many callers want to know", async () => {
        let asked = 0;
        let clock = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                asked += 1;
                return reading([{ durationMinutes: 300, usedPercent: asked, resetsAt: null }]);
            },
            ttlMs: TTL_MILLISECONDS,
            now: () => clock
        });

        await readings.read(HarnessKinds.CLAUDE);
        clock = TTL_MILLISECONDS - 1;
        const second = await readings.read(HarnessKinds.CLAUDE);

        expect(asked).toBe(1);
        expect(second.windows[0]?.used_percent).toBe(1);
    });

    it("asks again once the reading it held has expired", async () => {
        let asked = 0;
        let clock = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                asked += 1;
                return reading([{ durationMinutes: 300, usedPercent: asked, resetsAt: null }]);
            },
            ttlMs: TTL_MILLISECONDS,
            now: () => clock
        });

        await readings.read(HarnessKinds.CLAUDE);
        clock = TTL_MILLISECONDS;
        const second = await readings.read(HarnessKinds.CLAUDE);

        expect(asked).toBe(2);
        expect(second.windows[0]?.used_percent).toBe(2);
    });

    it("shares one request between callers that arrive together", async () => {
        let asked = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                asked += 1;
                await Promise.resolve();
                return reading([{ durationMinutes: 300, usedPercent: 7, resetsAt: null }]);
            }
        });

        const [first, second] = await Promise.all([
            readings.read(HarnessKinds.CLAUDE),
            readings.read(HarnessKinds.CLAUDE)
        ]);

        expect(asked).toBe(1);
        expect(first).toBe(second);
    });

    it("stands by the last answer when a vendor throttles the next reading", async () => {
        let asked = 0;
        let clock = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                asked += 1;
                if (asked > 1) {
                    throw new Error("Claude is rate-limiting the usage endpoint");
                }
                return reading([{ durationMinutes: 10_080, usedPercent: 100, resetsAt: null }]);
            },
            ttlMs: TTL_MILLISECONDS,
            now: () => clock
        });

        const first = await readings.read(HarnessKinds.CLAUDE);
        clock = TTL_MILLISECONDS;
        const throttled = await readings.read(HarnessKinds.CLAUDE);

        expect(asked).toBe(2);
        expect(throttled.state).toBe(SubscriptionAllowanceState.EXHAUSTED);
        expect(throttled.read_at).toBe(first.read_at);
    });

    it("waits out the interval again after a refused reading rather than retrying at once", async () => {
        let asked = 0;
        let clock = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async () => {
                asked += 1;
                if (asked > 1) {
                    throw new Error("Claude is rate-limiting the usage endpoint");
                }
                return reading([{ durationMinutes: 10_080, usedPercent: 100, resetsAt: null }]);
            },
            ttlMs: TTL_MILLISECONDS,
            now: () => clock
        });

        await readings.read(HarnessKinds.CLAUDE);
        clock = TTL_MILLISECONDS;
        await readings.read(HarnessKinds.CLAUDE);
        clock = TTL_MILLISECONDS + 1;
        await readings.read(HarnessKinds.CLAUDE);

        expect(asked).toBe(2);
    });

    it("asks the vendors again on a refresh however much of the interval is left", async () => {
        let asked = 0;
        const readings = new SubscriptionAllowanceReadings({
            read: async (kind) => {
                asked += 1;
                return { kind, plan: "max", windows: [] };
            },
            ttlMs: TTL_MILLISECONDS,
            now: () => 0
        });

        await readings.readAll();
        await readings.refreshAll();

        expect(asked).toBe(6);
    });

    it("reads every subscription the lab can run on, not only the ones that answered", async () => {
        const readings = new SubscriptionAllowanceReadings({
            read: async (kind) => {
                if (kind === HarnessKinds.CODEX) {
                    throw new Error("codex CLI is not installed");
                }
                return { kind, plan: "pro", windows: [] };
            }
        });

        const roster = await readings.readAll();

        expect(roster.map((allowance) => allowance.harness)).toEqual([
            HarnessKinds.CODEX,
            HarnessKinds.CLAUDE,
            HarnessKinds.GLM
        ]);
        expect(roster[0]?.state).toBe(SubscriptionAllowanceState.UNREADABLE);
    });
});
