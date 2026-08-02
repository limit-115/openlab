export const PostgreSqlTestContainer = {
    IMAGE: "postgres:18-alpine",
    STARTUP_TIMEOUT_MS: 120_000
} as const;
