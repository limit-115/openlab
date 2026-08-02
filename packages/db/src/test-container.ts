import { PostgreSqlContainer } from "@testcontainers/postgresql";

const PostgreSqlTestContainer = {
    IMAGE: "postgres:18-alpine",
    STARTUP_TIMEOUT_MS: 120_000
} as const;

export async function startPostgreSqlTestContainer(): Promise<() => Promise<void>> {
    const container = await new PostgreSqlContainer(PostgreSqlTestContainer.IMAGE)
        .withStartupTimeout(PostgreSqlTestContainer.STARTUP_TIMEOUT_MS)
        .start();
    process.env.TEST_DATABASE_URL = container.getConnectionUri();

    return async () => {
        delete process.env.TEST_DATABASE_URL;
        await container.stop();
    };
}
