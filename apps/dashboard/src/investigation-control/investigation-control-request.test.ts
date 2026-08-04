import { describe, expect, it, vi } from "vitest";
import { LAB_CONTROL_UNREACHABLE, LabControlAction } from "#src/lab-control/lab-control.const";
import { sendLabControl } from "#src/lab-control/lab-control-request";
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

describe("sendLabControl", () => {
    it("posts to the endpoint that owns the transition", async () => {
        const fetchMock = answerWith(statusFixture);

        await sendLabControl(LabControlAction.WAKE);

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/wake",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("keeps the daemon's own wording when it refuses the transition", async () => {
        answerWith({ error: "Cannot wake lab from RUNNING" }, 409);

        await expect(sendLabControl(LabControlAction.WAKE)).rejects.toThrow(
            "Cannot wake lab from RUNNING"
        );
    });

    it("reports an unreachable daemon rather than a transport failure", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await expect(sendLabControl(LabControlAction.STOP)).rejects.toThrow(
            LAB_CONTROL_UNREACHABLE
        );
    });
});
