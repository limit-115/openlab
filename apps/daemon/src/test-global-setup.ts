import { startPostgreSqlTestContainer } from "@lab/db/test-container";

export async function setup(): Promise<() => Promise<void>> {
    return startPostgreSqlTestContainer();
}
