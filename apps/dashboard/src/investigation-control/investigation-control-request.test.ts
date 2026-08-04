import { describe, expect, it, vi } from "vitest";
import {
    INVESTIGATION_CONTROL_UNREACHABLE,
    InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";
import { sendInvestigationControl } from "#src/investigation-control/investigation-control-request";
import { statusFixture } from "#src/test-support/status-fixture";

function answerWith(payload: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" }
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("sendInvestigationControl", () => {
    it("posts to the endpoint that owns the transition", async () => {
        const fetchMock = answerWith(statusFixture);

        await sendInvestigationControl("investigation-alpha-2026", InvestigationControlAction.WAKE);

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation-alpha-2026/wake",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("keeps the daemon's own wording when it refuses the transition", async () => {
        answerWith({ error: "Cannot wake investigation from RUNNING" }, 409);

        await expect(
            sendInvestigationControl("investigation-alpha-2026", InvestigationControlAction.WAKE)
        ).rejects.toThrow("Cannot wake investigation from RUNNING");
    });

    it("reports an unreachable daemon rather than a transport failure", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await expect(
            sendInvestigationControl("investigation-alpha-2026", InvestigationControlAction.STOP)
        ).rejects.toThrow(INVESTIGATION_CONTROL_UNREACHABLE);
    });
});
