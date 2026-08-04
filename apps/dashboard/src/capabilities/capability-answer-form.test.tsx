import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CAPABILITIES_EN } from "#src/capabilities/capabilities.i18n";
import { CapabilityAnswerForm } from "#src/capabilities/capability-answer-form";

const INVESTIGATION_ID = "investigation-alpha-2026";
const REQUEST_ID = "capability-dataset";

const REFUSAL = "Not giving you this one, rebuild it from the public mirrors";

function respondWith(payload: unknown, status = 202) {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderForm() {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <CapabilityAnswerForm
                investigationId="investigation-alpha-2026"
                requestId={REQUEST_ID}
            />
        </QueryClientProvider>
    );
}

describe("CapabilityAnswerForm", () => {
    it("sends a refusal to the daemon as readily as a handover", async () => {
        const fetchMock = respondWith({ accepted: true });
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(CAPABILITIES_EN.answerLabel), REFUSAL);
        await user.click(screen.getByRole("button", { name: "Answer" }));

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/investigations/${INVESTIGATION_ID}/capabilities/${REQUEST_ID}/answer`,
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ answer: REFUSAL })
            })
        );
    });

    it("sends a pasted credential through untouched, because the agent needs it", async () => {
        const fetchMock = respondWith({ accepted: true });
        const user = userEvent.setup();
        const credential = "TON_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz012345";
        renderForm();

        await user.type(screen.getByLabelText(CAPABILITIES_EN.answerLabel), credential);
        await user.click(screen.getByRole("button", { name: "Answer" }));

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/investigations/${INVESTIGATION_ID}/capabilities/${REQUEST_ID}/answer`,
            expect.objectContaining({ body: JSON.stringify({ answer: credential }) })
        );
    });

    it("clears the field once the daemon has taken the answer", async () => {
        respondWith({ accepted: true });
        const user = userEvent.setup();
        renderForm();

        const field = screen.getByLabelText(CAPABILITIES_EN.answerLabel);
        await user.type(field, REFUSAL);
        await user.click(screen.getByRole("button", { name: "Answer" }));

        expect(await screen.findByLabelText(CAPABILITIES_EN.answerLabel)).toHaveValue("");
    });

    it("keeps the daemon's own wording when the request is already settled", async () => {
        respondWith({ error: "Capability request is already answered" }, 409);
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(CAPABILITIES_EN.answerLabel), REFUSAL);
        await user.click(screen.getByRole("button", { name: "Answer" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("already answered");
    });
});
