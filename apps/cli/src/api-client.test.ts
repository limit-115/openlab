import { afterEach, describe, expect, it, vi } from "vitest";
import { LabApiClient, LabApiError } from "#src/api-client";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("LabApiClient", () => {
    it("posts capability references as JSON", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ accepted: true }), {
                status: 202,
                headers: { "content-type": "application/json" }
            })
        );
        vi.stubGlobal("fetch", fetchMock);
        const api = new LabApiClient("http://127.0.0.1:4317/");

        await expect(
            api.provide("request one", "file:///tmp/research-dataset.csv")
        ).resolves.toEqual({
            accepted: true
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "http://127.0.0.1:4317/api/capabilities/request%20one/provide",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("normalizes connection failures", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

        await expect(new LabApiClient("http://localhost").status()).rejects.toBeInstanceOf(
            LabApiError
        );
    });
});
