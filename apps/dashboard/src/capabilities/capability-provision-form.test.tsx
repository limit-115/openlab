import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RESOURCE_REFERENCE_LABEL } from "#src/capabilities/capability-provision.const";
import { CapabilityProvisionForm } from "#src/capabilities/capability-provision-form";

const REQUEST_ID = "capability-dataset";

const DATASET = "dataset://benchmarks.example/road-network";

function answerWith(payload: unknown, status = 202) {
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
            <CapabilityProvisionForm requestId={REQUEST_ID} />
        </QueryClientProvider>
    );
}

describe("CapabilityProvisionForm", () => {
    it("hands the reference to the request that is waiting on it", async () => {
        const fetchMock = answerWith({ accepted: true });
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(RESOURCE_REFERENCE_LABEL), DATASET);
        await user.click(screen.getByRole("button", { name: "Provide" }));

        expect(fetchMock).toHaveBeenCalledWith(
            `/api/capabilities/${REQUEST_ID}/provide`,
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ resource_reference: DATASET })
            })
        );
    });

    it("keeps a pasted credential in the browser instead of sending it to the daemon", async () => {
        const fetchMock = answerWith({ accepted: true });
        const user = userEvent.setup();
        renderForm();

        await user.type(
            screen.getByLabelText(RESOURCE_REFERENCE_LABEL),
            "dataset://benchmarks.example/road-network?api_key=abcd1234"
        );
        await user.click(screen.getByRole("button", { name: "Provide" }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(await screen.findByRole("alert")).toHaveTextContent(/credential/i);
    });

    it("clears the field once the daemon has taken the resource", async () => {
        answerWith({ accepted: true });
        const user = userEvent.setup();
        renderForm();

        const field = screen.getByLabelText(RESOURCE_REFERENCE_LABEL);
        await user.type(field, DATASET);
        await user.click(screen.getByRole("button", { name: "Provide" }));

        await vi.waitFor(() => expect(field).toHaveValue(""));
    });

    it("shows the daemon's refusal instead of pretending the resource landed", async () => {
        answerWith({ error: "Capability request is not open" }, 409);
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText(RESOURCE_REFERENCE_LABEL), DATASET);
        await user.click(screen.getByRole("button", { name: "Provide" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Capability request is not open"
        );
    });
});
