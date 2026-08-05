import { describe, expect, it, vi } from "vitest";
import { openDashboard } from "#src/lab-start/open-dashboard";

const LAB_URL = "http://127.0.0.1:4318";

describe("openDashboard", () => {
    it("shows the lab it just started to the operator watching the terminal", async () => {
        const browser = vi.fn(async () => undefined);

        expect(await openDashboard(LAB_URL, { browser, interactive: true })).toBe(true);
        expect(browser).toHaveBeenCalledWith(LAB_URL);
    });

    /** A service manager and a CI run both start labs, and neither has anybody to show one to. */
    it("leaves a terminal nobody is watching alone", async () => {
        const browser = vi.fn(async () => undefined);

        expect(await openDashboard(LAB_URL, { browser, interactive: false })).toBe(false);
        expect(browser).not.toHaveBeenCalled();
    });

    it("says the lab was not shown rather than taking a running lab down with it", async () => {
        const browser = vi.fn(async () => {
            throw new Error("No browser on this machine");
        });

        await expect(openDashboard(LAB_URL, { browser, interactive: true })).resolves.toBe(false);
    });
});
