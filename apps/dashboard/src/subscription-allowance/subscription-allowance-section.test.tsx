import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_ALLOWANCE_EN } from "#src/subscription-allowance/subscription-allowance.i18n";
import { SubscriptionAllowanceSection } from "#src/subscription-allowance/subscription-allowance-section";

import { formatDate } from "#src/value-display/timestamp-display";

const HELD_READING = "2026-08-03T12:00:00.000Z";
const FRESH_READING = "2026-08-03T12:41:00.000Z";

function roster(readAt: string, usedPercent: number): SubscriptionAllowanceRoster {
    return [
        {
            harness: AgentHarnessKind.GLM,
            state: SubscriptionAllowanceState.AVAILABLE,
            plan: "pro",
            windows: [{ duration_minutes: 300, used_percent: usedPercent, resets_at: null }],
            error: null,
            read_at: readAt
        }
    ];
}

const ROSTER = roster(HELD_READING, 97);

function respondWith(payload: unknown, status = 200) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(payload), {
                status,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
}

/** The daemon serves what it holds until it is asked for a fresh reading, exactly as it does live. */
function respondByReading(held: unknown, fresh: unknown) {
    const request = vi.fn((url: string) =>
        Promise.resolve(
            new Response(JSON.stringify(url.includes("fresh=1") ? fresh : held), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
}

/**
 * The lab as this block sees it: the readings on one address and the settings the caps live in on
 * another, with every write answered by whatever the lab decides to store.
 */
function respondAsLab(settings: unknown, stored: unknown = settings) {
    const request = vi.fn((url: string, init?: RequestInit) => {
        const body =
            url.includes("/api/settings") === false
                ? ROSTER
                : init?.method === "PUT"
                  ? stored
                  : settings;
        return Promise.resolve(
            new Response(JSON.stringify(body), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        );
    });
    vi.stubGlobal("fetch", request);
    return request;
}

function savedCaps(request: ReturnType<typeof respondAsLab>): unknown {
    const write = request.mock.calls.find(([, init]) => init?.method === "PUT");
    if (write === undefined) {
        throw new Error("The block never handed the caps over");
    }
    return LabSettingsSchema.parse(JSON.parse(String(write[1]?.body))).spend_caps;
}

function renderView() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<SubscriptionAllowanceSection />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

describe("SubscriptionAllowanceSection", () => {
    it("reads the allowance off the runtime and meters it", async () => {
        respondWith(ROSTER);
        renderView();

        const session = await screen.findByLabelText<HTMLProgressElement>("5 hours window");

        expect(session.value).toBe(97);
        expect(screen.getByText("pro")).toBeInTheDocument();
    });

    it("dates the numbers by the moment the vendors were read", async () => {
        respondWith(ROSTER);
        renderView();

        expect(
            await screen.findByText(
                `${SUBSCRIPTION_ALLOWANCE_EN.readAt} ${formatDate(HELD_READING)}`
            )
        ).toBeInTheDocument();
    });

    it("asks the vendors again on refresh rather than for the reading already on the page", async () => {
        const request = respondByReading(ROSTER, roster(FRESH_READING, 12));
        renderView();
        await screen.findByLabelText("5 hours window");

        await userEvent.click(
            screen.getByRole("button", { name: SUBSCRIPTION_ALLOWANCE_EN.refresh })
        );

        expect(
            await screen.findByText(
                `${SUBSCRIPTION_ALLOWANCE_EN.readAt} ${formatDate(FRESH_READING)}`
            )
        ).toBeInTheDocument();
        expect(request.mock.calls.at(-1)?.[0]).toContain("fresh=1");
        expect(screen.getByLabelText<HTMLProgressElement>("5 hours window").value).toBe(12);
    });

    it("says the vendors could not be asked again rather than redating the standing numbers", async () => {
        respondWith(ROSTER);
        renderView();
        await screen.findByLabelText("5 hours window");
        respondWith({ error: "Codex is rate-limiting the usage endpoint" }, 503);

        await userEvent.click(
            screen.getByRole("button", { name: SUBSCRIPTION_ALLOWANCE_EN.refresh })
        );

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(
            screen.getByText(`${SUBSCRIPTION_ALLOWANCE_EN.readAt} ${formatDate(HELD_READING)}`)
        ).toBeInTheDocument();
    });

    it("says why there are no numbers when the runtime does not serve the readings", async () => {
        respondWith({ error: "Not found" }, 404);
        renderView();

        expect(await screen.findByText(SUBSCRIPTION_ALLOWANCE_EN.emptyTitle)).toBeInTheDocument();
        expect(screen.queryByLabelText("5 hours window")).not.toBeInTheDocument();
    });

    it("hands the lab the cap the operator moved the limiter to, and nothing else", async () => {
        const request = respondAsLab(LabSettingsSchema.parse({}));
        renderView();
        const limiter = await screen.findByRole("slider", { name: "5 hours spend cap" });

        limiter.focus();
        await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
        await userEvent.click(
            screen.getByRole("button", { name: SUBSCRIPTION_ALLOWANCE_EN.capSave })
        );

        expect(savedCaps(request)).toEqual([
            { harness: AgentHarnessKind.GLM, window_minutes: 300, max_used_percent: 90 }
        ]);
    });

    it("stands the limiters where the lab is holding, not where they were dragged", async () => {
        const request = respondAsLab(
            LabSettingsSchema.parse({}),
            LabSettingsSchema.parse({
                spend_caps: [
                    { harness: AgentHarnessKind.GLM, window_minutes: 300, max_used_percent: 45 }
                ]
            })
        );
        renderView();
        const limiter = await screen.findByRole("slider", { name: "5 hours spend cap" });

        limiter.focus();
        await userEvent.keyboard("{ArrowLeft}");
        await userEvent.click(
            screen.getByRole("button", { name: SUBSCRIPTION_ALLOWANCE_EN.capSave })
        );

        expect(await screen.findByText(SUBSCRIPTION_ALLOWANCE_EN.capSaved)).toBeInTheDocument();
        expect(
            screen.getByRole("slider", { name: "5 hours spend cap" }).getAttribute("aria-valuenow")
        ).toBe("45");
        expect(request.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
    });

    it("offers no save while the limiters stand where the lab left them", async () => {
        respondAsLab(LabSettingsSchema.parse({}));
        renderView();
        await screen.findByRole("slider", { name: "5 hours spend cap" });

        expect(
            screen.queryByRole("button", { name: SUBSCRIPTION_ALLOWANCE_EN.capSave })
        ).not.toBeInTheDocument();
    });

    it("meters without limiters when the runtime does not serve its settings", async () => {
        respondWith(ROSTER);
        renderView();

        await screen.findByLabelText("5 hours window");

        expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    });
});
