import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "#src/design-system/tooltip";
import { HarnessReadinessList } from "#src/harness-setup/harness-readiness-list";
import {
    HARNESS_INSTALL_COMMAND,
    HARNESS_SIGN_IN_COMMAND
} from "#src/harness-setup/harness-setup.const";
import { HARNESS_SETUP_EN } from "#src/harness-setup/harness-setup.i18n";

const CHECKED_AT = "2026-08-05T09:00:00.000Z";

function stood(
    harness: AgentHarnessKind,
    state: HarnessReadinessState,
    rest: Partial<HarnessReadiness> = {}
): HarnessReadiness {
    return {
        harness,
        state,
        cli_version: null,
        plan: null,
        balance: null,
        error: null,
        checked_at: CHECKED_AT,
        ...rest
    };
}

function renderList(harnesses: HarnessReadiness[]) {
    return render(
        <TooltipProvider>
            <HarnessReadinessList harnesses={harnesses} unreachable={false} />
        </TooltipProvider>
    );
}

describe("HarnessReadinessList", () => {
    /** Installing and signing in are different jobs, and a card only ever asks for the current one. */
    it("asks a missing CLI to be installed and says nothing about signing in yet", () => {
        renderList([stood(AgentHarnessKind.CODEX, HarnessReadinessState.NOT_INSTALLED)]);

        expect(
            screen.getByText(HARNESS_INSTALL_COMMAND[AgentHarnessKind.CODEX])
        ).toBeInTheDocument();
        expect(
            screen.queryByText(HARNESS_SIGN_IN_COMMAND[AgentHarnessKind.CODEX] ?? "")
        ).not.toBeInTheDocument();
    });

    it("asks an installed CLI to be signed in and stops telling it to install", () => {
        renderList([stood(AgentHarnessKind.CODEX, HarnessReadinessState.NOT_SIGNED_IN)]);

        expect(
            screen.getByText(HARNESS_SIGN_IN_COMMAND[AgentHarnessKind.CODEX] ?? "")
        ).toBeInTheDocument();
        expect(
            screen.queryByText(HARNESS_INSTALL_COMMAND[AgentHarnessKind.CODEX])
        ).not.toBeInTheDocument();
    });

    /**
     * There is no terminal command for this one, so the card has to carry the steps instead. A card
     * that fell back to a generic "sign in" would leave the operator looking for a command that does
     * not exist.
     */
    it("gives GLM the steps for a sign-in that does not happen in a terminal", () => {
        renderList([stood(AgentHarnessKind.GLM, HarnessReadinessState.NOT_SIGNED_IN)]);

        expect(screen.getByText(HARNESS_SETUP_EN.signInGlm)).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    /** A ready harness is done being talked about: nothing on its card is for the operator to do. */
    it("asks nothing of a harness that already answered", () => {
        renderList([
            stood(AgentHarnessKind.CLAUDE, HarnessReadinessState.READY, {
                cli_version: "2.1.222 (Claude Code)",
                plan: "max"
            })
        ]);

        expect(screen.getByText("2.1.222 (Claude Code)")).toBeInTheDocument();
        expect(
            screen.queryByText(HARNESS_INSTALL_COMMAND[AgentHarnessKind.CLAUDE])
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(HARNESS_SIGN_IN_COMMAND[AgentHarnessKind.CLAUDE] ?? "")
        ).not.toBeInTheDocument();
    });

    /** The lab could not say what went wrong, so the vendor's own words are all the operator has. */
    it("carries through what a check that broke actually said", () => {
        const timedOut = "codex harness preflight timed out after 30000 ms";
        renderList([
            stood(AgentHarnessKind.CODEX, HarnessReadinessState.UNREADABLE, { error: timedOut })
        ]);

        expect(screen.getByText(timedOut)).toBeInTheDocument();
        expect(
            screen.queryByText(HARNESS_INSTALL_COMMAND[AgentHarnessKind.CODEX])
        ).not.toBeInTheDocument();
    });
});
