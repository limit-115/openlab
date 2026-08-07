import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import { HarnessReadinessList } from "#src/harness-setup/harness-readiness-list";
import { HARNESS_SETUP_EN } from "#src/harness-setup/harness-setup.i18n";

const API_KEY = "sk-operator-typed-this";

function stood(state: HarnessReadinessState, rest: Partial<HarnessReadiness> = {}) {
    return {
        harness: AgentHarnessKind.DEEPSEEK,
        state,
        cli_version: null,
        plan: null,
        balance: null,
        error: null,
        checked_at: "2026-08-05T09:00:00.000Z",
        ...rest
    } satisfies HarnessReadiness;
}

/** Answers the key endpoint, and reports every request so a write can be read back off it. */
function respond(keySet: boolean) {
    const request = vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify({ key_set: init?.method === "DELETE" ? false : keySet }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
}

function renderCard(harness: HarnessReadiness) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <TooltipProvider>
                <HarnessReadinessList harnesses={[harness]} unreachable={false} />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

describe("the DeepSeek harness card", () => {
    /**
     * Every other harness is paid for before the lab starts. This one bills while it works, and an
     * operator who is never told that finds out from an invoice.
     */
    it("says outright that this harness spends money as it runs", () => {
        respond(false);
        renderCard(stood(HarnessReadinessState.NOT_SIGNED_IN));

        expect(screen.getByText(HARNESS_SETUP_EN.billingUsage)).toBeInTheDocument();
        expect(screen.getByText(HARNESS_SETUP_EN.billingUsageNote)).toBeInTheDocument();
    });

    it("hands the typed key to the lab and stops showing it", async () => {
        const request = respond(false);
        renderCard(stood(HarnessReadinessState.NOT_SIGNED_IN));

        const field = screen.getByLabelText(HARNESS_SETUP_EN.deepseekKeyLabel);
        await userEvent.type(field, API_KEY);
        await userEvent.click(
            screen.getByRole("button", { name: HARNESS_SETUP_EN.deepseekKeySave })
        );

        await waitFor(() => expect(field).toHaveValue(""));
        const written = request.mock.calls.find(([, init]) => init?.method === "PUT");
        expect(JSON.parse(String(written?.[1]?.body))).toEqual({ api_key: API_KEY });
    });

    /**
     * Forgetting the key is the only control that stops the lab spending the wallet, so a harness
     * that is ready — the moment it is actually spending — must still offer it.
     */
    it("still offers to forget the key once the harness is ready", async () => {
        respond(true);
        renderCard(stood(HarnessReadinessState.READY, { balance: "42.50 USD" }));

        expect(
            await screen.findByRole("button", { name: HARNESS_SETUP_EN.deepseekKeyForget })
        ).toBeInTheDocument();
        expect(screen.getByText("42.50 USD")).toBeInTheDocument();
    });

    /** A key is no use until the CLI that spends it is on the machine, so installing comes first. */
    it("asks for the CLI before it asks for a key", () => {
        respond(false);
        renderCard(stood(HarnessReadinessState.NOT_INSTALLED));

        expect(screen.queryByLabelText(HARNESS_SETUP_EN.deepseekKeyLabel)).not.toBeInTheDocument();
    });
});
