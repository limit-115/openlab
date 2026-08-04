import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import type { LabSettings } from "@lab/protocol/lab-settings/lab-settings.types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NO_SETTINGS_TITLE, SAVE_LABEL } from "#src/harness-settings/harness-settings.const";
import { HarnessSettingsSection } from "#src/harness-settings/harness-settings-section";

const SHIPPED = LabSettingsSchema.parse({});

/** Answers the read with what the lab holds, and every write with whatever it decides to store. */
function respond(read: unknown, written: unknown = read, readStatus = 200) {
    const request = vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(init?.method === "PUT" ? written : read), {
                status: init?.method === "PUT" ? 200 : readStatus,
                headers: { "Content-Type": "application/json" }
            })
        )
    );
    vi.stubGlobal("fetch", request);
    return request;
}

function renderSection() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<HarnessSettingsSection />, {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        )
    });
}

function savedSettings(request: ReturnType<typeof respond>): LabSettings {
    const write = request.mock.calls.find(([, init]) => init?.method === "PUT");
    if (write === undefined) {
        throw new Error("The section never wrote the settings");
    }
    return LabSettingsSchema.parse(JSON.parse(String(write[1]?.body)));
}

async function roleField(role: string) {
    return within(await screen.findByRole("listitem", { name: role }));
}

describe("HarnessSettingsSection", () => {
    it("sends the model an operator typed for one role on one harness, and no other", async () => {
        const request = respond(SHIPPED);
        renderSection();
        const director = await roleField(AgentRole.DIRECTOR);

        await userEvent.type(director.getByLabelText(AgentHarnessKind.CLAUDE), "opus");
        await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

        const saved = savedSettings(request);
        expect(
            saved.role_execution.find(({ role }) => role === AgentRole.DIRECTOR)?.models
        ).toEqual([{ harness: AgentHarnessKind.CLAUDE, model: "opus" }]);
        expect(
            saved.role_execution.find(({ role }) => role === AgentRole.RESEARCHER)?.models
        ).toEqual([]);
    });

    it("sends the effort an operator chose for a role", async () => {
        const request = respond(SHIPPED);
        renderSection();
        const verifier = await roleField(AgentRole.VERIFIER);

        await userEvent.click(verifier.getByRole("radio", { name: AgentEffortLevel.MAX }));
        await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

        expect(
            savedSettings(request).role_execution.find(({ role }) => role === AgentRole.VERIFIER)
                ?.effort
        ).toBe(AgentEffortLevel.MAX);
    });

    it("drops a harness the operator unticked out of the roster it sends", async () => {
        const request = respond(SHIPPED);
        renderSection();

        await userEvent.click(
            await screen.findByRole("checkbox", { name: AgentHarnessKind.CODEX })
        );
        await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

        expect(savedSettings(request).harness_roster).toEqual([
            AgentHarnessKind.CLAUDE,
            AgentHarnessKind.GLM
        ]);
    });

    it("refuses to send a roster with nothing left to dispatch to", async () => {
        respond(SHIPPED);
        renderSection();

        for (const harness of Object.values(AgentHarnessKind)) {
            await userEvent.click(await screen.findByRole("checkbox", { name: harness }));
        }

        expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeDisabled();
    });

    it("shows what the lab stored rather than what was typed into the page", async () => {
        respond(
            SHIPPED,
            LabSettingsSchema.parse({
                harness_roster: [AgentHarnessKind.GLM],
                role_execution: [
                    {
                        role: AgentRole.DIRECTOR,
                        models: [{ harness: AgentHarnessKind.CLAUDE, model: "sonnet" }]
                    }
                ]
            })
        );
        renderSection();
        const director = await roleField(AgentRole.DIRECTOR);
        await userEvent.type(director.getByLabelText(AgentHarnessKind.CLAUDE), "opus");

        await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

        expect(
            (await roleField(AgentRole.DIRECTOR)).getByLabelText<HTMLInputElement>(
                AgentHarnessKind.CLAUDE
            )
        ).toHaveValue("sonnet");
        expect(screen.getByRole("checkbox", { name: AgentHarnessKind.CODEX })).not.toBeChecked();
    });

    it("says why there is nothing to set when the runtime does not serve the settings", async () => {
        respond({ error: "Not found" }, undefined, 404);
        renderSection();

        expect(await screen.findByText(NO_SETTINGS_TITLE)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: SAVE_LABEL })).not.toBeInTheDocument();
    });
});
