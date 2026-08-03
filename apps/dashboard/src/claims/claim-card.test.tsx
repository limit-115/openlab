import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClaimsPanel } from "#src/claims/claims-panel";
import { statusFixture } from "#src/test-support/status-fixture";

const claim = statusFixture.claims[0];
const experiment = statusFixture.experiments[0];

if (claim === undefined || experiment === undefined) {
    throw new Error("The status fixture no longer carries a claim and an experiment");
}

const evidence = {
    id: claim.supporting_evidence_ids[0],
    kind: EvidenceKind.EXPERIMENT,
    claim_id: claim.id,
    run_id: experiment.id,
    summary: "Median node expansions fell 31% on the held-out set",
    supports: true,
    independent: true,
    created_at: "2026-08-02T10:00:00.000Z"
};

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    return render(
        <ClaimsPanel claims={statusFixture.claims} experiments={statusFixture.experiments} />,
        { wrapper: Wrapper }
    );
}

function serveEvidence() {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(evidence), {
            headers: { "Content-Type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("ClaimCard", () => {
    it("shows the command of the run its evidence names", async () => {
        serveEvidence();
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: /evidence and the runs/i }));

        expect(await screen.findByText(evidence.summary)).toBeInTheDocument();
        expect(screen.getByText(experiment.command)).toBeInTheDocument();
    });

    it("leaves the evidence unread until the claim is opened", async () => {
        const fetchMock = serveEvidence();
        const user = userEvent.setup();
        renderPanel();

        expect(fetchMock).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: /evidence and the runs/i }));

        expect(await screen.findByText(evidence.summary)).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            `/api/inspect/${evidence.id}`,
            expect.objectContaining({ headers: { Accept: "application/json" } })
        );
    });

    it("explains an evidence record the runtime cannot produce", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: /evidence and the runs/i }));

        expect(
            await screen.findByText(`The runtime has no record for evidence ${evidence.id}.`)
        ).toBeInTheDocument();
    });
});
