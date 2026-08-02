import { startPostgreSqlTestContainer } from "@lab/db/lab-database/postgres-test-container";

export async function setup(): Promise<() => Promise<void>> {
    return startPostgreSqlTestContainer();
}
