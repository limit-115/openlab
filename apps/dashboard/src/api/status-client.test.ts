import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStatus, StatusRequestError } from "#src/api/status-client";
import { statusFixture } from "#src/test/status-fixture";

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

        await expect(fetchStatus()).resolves.toEqual(statusFixture);
    });

    it("rejects a malformed runtime payload", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ lab: { state: "INVENTED" } }), {
                    headers: { "Content-Type": "application/json" }
                })
            )
        );

        await expect(fetchStatus()).rejects.toThrow();
    });

    it("returns an actionable message when no lab exists", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

        const request = fetchStatus();
        await expect(request).rejects.toBeInstanceOf(StatusRequestError);
        await expect(request).rejects.toThrow("Start one from the CLI");
    });
});
