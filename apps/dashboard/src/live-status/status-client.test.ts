import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStatus, StatusRequestError } from "#src/live-status/status-client";
import { statusFixture } from "#src/test-support/status-fixture";

describe("fetchStatus", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("validates and returns a canonical status snapshot", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify(statusFixture), {
                    headers: { "Content-Type": "application/json" }
                })
            )
        );

        await expect(fetchStatus("investigation-alpha-2026")).resolves.toEqual(statusFixture);
    });

    it("rejects a malformed runtime payload", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ investigation: { state: "INVENTED" } }), {
                    headers: { "Content-Type": "application/json" }
                })
            )
        );

        await expect(fetchStatus("investigation-alpha-2026")).rejects.toThrow();
    });

    it("says the investigation is gone rather than reporting a bare 404", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

        const request = fetchStatus("investigation-alpha-2026");
        await expect(request).rejects.toBeInstanceOf(StatusRequestError);
        await expect(request).rejects.toThrow("not holding this investigation");
    });

    it("asks for the investigation the caller named", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(statusFixture), {
                headers: { "Content-Type": "application/json" }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        await fetchStatus("investigation alpha");

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/investigations/investigation%20alpha/status",
            expect.anything()
        );
    });
});
