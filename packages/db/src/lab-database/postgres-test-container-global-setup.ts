import { startPostgreSqlTestContainer } from "#src/lab-database/postgres-test-container";

export async function setup(): Promise<() => Promise<void>> {
    return startPostgreSqlTestContainer();
}
