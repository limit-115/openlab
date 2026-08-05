import { existsSync } from "node:fs";
import path from "node:path";
import type { ShippedDirectory } from "#src/lab-installation/shipped-directory.const";

/**
 * Where a released lab keeps one of the directories it ships with, or nothing when this is not a
 * released lab at all.
 *
 * A lab runs two ways. A developer runs the sources, where the dashboard and the migrations are
 * still inside the packages that own them and each package can be asked where it is. An operator
 * runs one compiled executable, where no package exists to ask: the code was bundled and the
 * modules it came from have no place on disk any more. What a release has instead is a layout —
 * the executable and these directories, installed together — so a released lab finds them by
 * looking beside itself.
 *
 * Finding nothing is the ordinary answer when the sources are being run, and the caller is expected
 * to fall back to asking the package that owns the directory.
 */
export function shippedDirectory(name: ShippedDirectory): string | undefined {
    const beside = path.join(path.dirname(process.execPath), name);
    return existsSync(beside) ? beside : undefined;
}
