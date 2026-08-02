import { startPostgreSqlTestContainer } from "#src/test-container";

export async function setup(): Promise<() => Promise<void>> {
    return startPostgreSqlTestContainer();
}
