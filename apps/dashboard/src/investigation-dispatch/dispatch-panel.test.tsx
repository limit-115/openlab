import { AgentHarnessKind } from "@nightlab/protocol/agents/agent-execution.const";
import { InvestigationDispatchSchema } from "@nightlab/protocol/investigation-input/investigation-dispatch.schema";
import type { InvestigationDispatch } from "@nightlab/protocol/investigation-input/investigation-dispatch.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { DispatchPanel } from "#src/investigation-dispatch/dispatch-panel";
import { INVESTIGATION_DISPATCH_EN } from "#src/investigation-dispatch/investigation-dispatch.i18n";

const INVESTIGATION_ID = "investigation-under-the-caps";

const HELD: InvestigationDispatch = {
    harness_kinds: [AgentHarnessKind.CODEX, AgentHarnessKind.CLAUDE, AgentHarnessKind.GLM],
    spend_past_caps: false
};

/** Answers the read with what the lab holds, and every write with whatever it decides to store. */
function respond(read: unknown, stored: unknown = read, readStatus = 200) {
    const request = vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(init?.method === "PUT" ? stored : read), {
                status: init?.method === "PUT" ? 200 : readStatus,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<DispatchPanel investigationId={INVESTIGATION_ID} />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

function sentDispatch(request: ReturnType<typeof respond>): InvestigationDispatch {
    const write = request.mock.calls.find(([, init]) => init?.method === "PUT");
    if (write === undefined) {
        throw new Error("The panel never handed the dispatch over");
    }
    return InvestigationDispatchSchema.parse(JSON.parse(String(write[1]?.body)));
}

describe("DispatchPanel", () => {
    it("points the investigation at the harnesses the operator left ticked", async () => {
        const request = respond(HELD);
        renderPanel();

        await userEvent.click(
            await screen.findByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.CODEX] })
        );
        await userEvent.click(screen.getByRole("button", { name: INVESTIGATION_DISPATCH_EN.save }));

        expect(sentDispatch(request).harness_kinds).toEqual([
            AgentHarnessKind.CLAUDE,
            AgentHarnessKind.GLM
        ]);
    });

    it("takes the lab's caps off the one investigation the operator says so for", async () => {
        const request = respond(HELD);
        renderPanel();

        await userEvent.click(
            await screen.findByRole("switch", { name: INVESTIGATION_DISPATCH_EN.pastCaps })
        );
        await userEvent.click(screen.getByRole("button", { name: INVESTIGATION_DISPATCH_EN.save }));

        expect(sentDispatch(request)).toEqual({
            harness_kinds: HELD.harness_kinds,
            spend_past_caps: true
        });
    });

    it("shows what the lab is dispatching by rather than what was ticked into the page", async () => {
        respond(HELD, { harness_kinds: [AgentHarnessKind.GLM], spend_past_caps: true });
        renderPanel();

        await userEvent.click(
            await screen.findByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.CODEX] })
        );
        await userEvent.click(screen.getByRole("button", { name: INVESTIGATION_DISPATCH_EN.save }));

        expect(await screen.findByText(INVESTIGATION_DISPATCH_EN.saved)).toBeInTheDocument();
        expect(
            screen.getByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.GLM] })
        ).toBeChecked();
        expect(
            screen.getByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.CLAUDE] })
        ).not.toBeChecked();
        expect(
            screen.getByRole("switch", { name: INVESTIGATION_DISPATCH_EN.pastCaps })
        ).toBeChecked();
    });

    it("refuses to send a roster with nothing left to dispatch to", async () => {
        respond(HELD);
        renderPanel();

        for (const harness of Object.values(AgentHarnessKind)) {
            await userEvent.click(
                await screen.findByRole("checkbox", { name: HARNESS_NAME[harness] })
            );
        }

        expect(screen.getByRole("button", { name: INVESTIGATION_DISPATCH_EN.save })).toBeDisabled();
    });

    it("offers no save while the page holds exactly what the lab does", async () => {
        respond(HELD);
        renderPanel();

        await screen.findByRole("checkbox", { name: HARNESS_NAME[AgentHarnessKind.CODEX] });

        expect(
            screen.queryByRole("button", { name: INVESTIGATION_DISPATCH_EN.save })
        ).not.toBeInTheDocument();
    });

    it("says why there is nothing to set when the runtime does not serve the dispatch", async () => {
        respond({ error: "Not found" }, undefined, 404);
        renderPanel();

        expect(
            await screen.findByText(INVESTIGATION_DISPATCH_EN.unsupportedTitle)
        ).toBeInTheDocument();
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });
});
