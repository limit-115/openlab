import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globalSetup: [path.join(import.meta.dirname, "src", "test-global-setup.ts")],
        hookTimeout: 120_000,
        testTimeout: 30_000
    }
});
