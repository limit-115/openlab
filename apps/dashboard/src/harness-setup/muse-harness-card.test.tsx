import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import { HarnessReadinessList } from "#src/harness-setup/harness-readiness-list";
import { HARNESS_SETUP_EN } from "#src/harness-setup/harness-setup.i18n";

function stood(state: HarnessReadinessState, rest: Partial<HarnessReadiness> = {}) {
    return {
        harness: AgentHarnessKind.MUSE,
        state,
        cli_version: null,
        plan: null,
        balance: null,
        error: null,
        checked_at: "2026-08-07T09:00:00.000Z",
        ...rest
    } satisfies HarnessReadiness;
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

describe("the Muse Code harness card", () => {
    /**
     * Both usage harnesses spend while they run, and only this one leaves the operator with no way to
     * watch it happen. Carrying DeepSeek's sentence here instead would tell them to forget a key that
     * does not exist, so the card has to be shown to pick its own.
     */
    it("says the run is metered and that nothing on this page can meter it", () => {
        renderCard(stood(HarnessReadinessState.NOT_SIGNED_IN));

        expect(screen.getByText(HARNESS_SETUP_EN.billingUsageNote)).toBeInTheDocument();
        expect(screen.getByText(HARNESS_SETUP_EN.billingUsageMuse)).toBeInTheDocument();
        expect(screen.queryByText(HARNESS_SETUP_EN.billingUsageDeepseek)).not.toBeInTheDocument();
    });

    it("sends the operator to the terminal login and asks for no key", () => {
        renderCard(stood(HarnessReadinessState.NOT_SIGNED_IN));

        expect(screen.getByText("muse login")).toBeInTheDocument();
        expect(screen.queryByLabelText(HARNESS_SETUP_EN.deepseekKeyLabel)).not.toBeInTheDocument();
    });

    /** There is no plan to show, so the account carrying the bill is the whole of what can be shown. */
    it("names the account Meta will bill once the harness is ready", () => {
        const billed = "metered, billed to operator@example.invalid";
        renderCard(stood(HarnessReadinessState.READY, { balance: billed }));

        expect(screen.getByText(billed)).toBeInTheDocument();
        expect(screen.queryByText(HARNESS_SETUP_EN.signInMuse)).not.toBeInTheDocument();
    });
});
