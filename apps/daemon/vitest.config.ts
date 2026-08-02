import path from "node:path";
import { defineConfig } from "vitest/config";

const integrationGlobalSetup = path.join(import.meta.dirname, "src", "test-global-setup.ts");

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: "unit",
                    include: ["**/*.test.ts"],
                    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
                    hookTimeout: 120_000,
                    testTimeout: 30_000
                }
            },
            {
                test: {
                    name: "integration",
                    include: ["**/*.integration.test.ts"],
                    globalSetup: [integrationGlobalSetup],
                    hookTimeout: 120_000,
                    testTimeout: 30_000
                }
            }
        ]
    }
});
