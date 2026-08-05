import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { shippedDirectory } from "#src/lab-installation/shipped-directory";
import { ShippedDirectory } from "#src/lab-installation/shipped-directory.const";

/**
 * The executable a released lab runs as is the only thing it can be sure of, so these cases move
 * it: each one lays out a release around a pretend executable and then asks the lab what it finds.
 */
describe("shippedDirectory", () => {
    const realExecutable = process.execPath;
    let laidOut: string | undefined;

    afterEach(async () => {
        Object.defineProperty(process, "execPath", { value: realExecutable, configurable: true });
        if (laidOut !== undefined) {
            await rm(laidOut, { recursive: true, force: true });
            laidOut = undefined;
        }
    });

    /** Stands an executable inside a directory laid out the way a release is installed. */
    async function releaseHolding(...directories: readonly string[]): Promise<void> {
        const root = await mkdtemp(path.join(tmpdir(), "openlab-release-"));
        laidOut = root;
        for (const directory of directories) {
            await mkdir(path.join(root, directory));
        }
        const executable = path.join(root, "openlab");
        await writeFile(executable, "");
        Object.defineProperty(process, "execPath", { value: executable, configurable: true });
    }

    it("finds a directory the release installed beside the executable", async () => {
        await releaseHolding(ShippedDirectory.DASHBOARD, ShippedDirectory.MIGRATIONS);

        expect(shippedDirectory(ShippedDirectory.DASHBOARD)).toBe(
            path.join(path.dirname(process.execPath), ShippedDirectory.DASHBOARD)
        );
    });

    /** A release missing one directory still answers for the others rather than for none. */
    it("answers for each directory on its own", async () => {
        await releaseHolding(ShippedDirectory.MIGRATIONS);

        expect(shippedDirectory(ShippedDirectory.MIGRATIONS)).toBeDefined();
        expect(shippedDirectory(ShippedDirectory.DASHBOARD)).toBeUndefined();
    });

    /**
     * Running the sources, the executable is whichever runtime the developer started, and nothing
     * of the lab's is beside it. Finding nothing is how the caller knows to ask the package instead.
     */
    it("finds nothing beside a runtime that is merely running the sources", () => {
        expect(shippedDirectory(ShippedDirectory.DASHBOARD)).toBeUndefined();
        expect(shippedDirectory(ShippedDirectory.MIGRATIONS)).toBeUndefined();
    });
});
