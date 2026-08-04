import { afterEach, describe, expect, it, vi } from "vitest";
import { LabApiClient, LabApiError } from "#src/api-client";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("LabApiClient", () => {
    it("posts the operator answer as JSON", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ accepted: true }), {
                status: 202,
                headers: { "content-type": "application/json" }
            })
        );
        vi.stubGlobal("fetch", fetchMock);
        const api = new LabApiClient("http://127.0.0.1:4317/");

        await expect(
            api.answer(
                "investigation one",
                "request one",
                "Not giving you this one, build it yourself"
            )
        ).resolves.toEqual({
            accepted: true
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "http://127.0.0.1:4317/api/investigations/investigation%20one/capabilities/request%20one/answer",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ answer: "Not giving you this one, build it yourself" })
            })
        );
    });

    it("normalizes connection failures", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

        await expect(
            new LabApiClient("http://localhost").status("investigation-1")
        ).rejects.toBeInstanceOf(LabApiError);
    });
});
