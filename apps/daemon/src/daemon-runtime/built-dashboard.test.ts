import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { builtDashboardRoot } from "#src/daemon-runtime/built-dashboard";

describe("builtDashboardRoot", () => {
    it("lands inside the dashboard package rather than wherever the daemon sits", async () => {
        const root = builtDashboardRoot();

        const manifest = await readFile(path.join(root, "..", "package.json"), "utf8");
        expect(JSON.parse(manifest).name).toBe("@lab/dashboard");
        expect(path.isAbsolute(root)).toBe(true);
    });
});
