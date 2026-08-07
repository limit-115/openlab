import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import { HarnessSetupStep } from "#src/welcome/harness-setup-step";
import { WELCOME_EN } from "#src/welcome/welcome.i18n";

function stood(harness: AgentHarnessKind, state: HarnessReadinessState): HarnessReadiness {
    return {
        harness,
        state,
        cli_version: state === HarnessReadinessState.READY ? "codex-cli 0.146.0" : null,
        plan: null,
        balance: null,
        error: null,
        checked_at: "2026-08-05T09:00:00.000Z"
    };
}

function openStep(roster: HarnessReadiness[]) {
    vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(JSON.stringify(roster), { status: 200 })))
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <MemoryRouter>
            <QueryClientProvider client={client}>
                <TooltipProvider>
                    <HarnessSetupStep />
                </TooltipProvider>
            </QueryClientProvider>
        </MemoryRouter>
    );
}

function goOn() {
    return screen.getByRole("button", { name: WELCOME_EN.continue });
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("HarnessSetupStep", () => {
    /**
     * A lab with nothing to dispatch to would take the goal on the next step and hibernate on it,
     * which is a worse first cycle than being stopped here with the reason on screen.
     */
    it("holds the operator on the step while nothing on the machine can run", async () => {
        openStep([
            stood(AgentHarnessKind.CODEX, HarnessReadinessState.NOT_INSTALLED),
            stood(AgentHarnessKind.CLAUDE, HarnessReadinessState.NOT_SIGNED_IN),
            stood(AgentHarnessKind.GLM, HarnessReadinessState.UNREADABLE)
        ]);

        expect(await screen.findByRole("button", { name: WELCOME_EN.continue })).toBeDisabled();
    });

    /** One is enough: the second harness buys verification, not the ability to start. */
    it("lets the operator go on as soon as one harness answered", async () => {
        openStep([
            stood(AgentHarnessKind.CODEX, HarnessReadinessState.READY),
            stood(AgentHarnessKind.CLAUDE, HarnessReadinessState.NOT_INSTALLED),
            stood(AgentHarnessKind.GLM, HarnessReadinessState.NOT_INSTALLED)
        ]);

        await screen.findByText("codex-cli 0.146.0");

        expect(goOn()).toBeEnabled();
    });
});
