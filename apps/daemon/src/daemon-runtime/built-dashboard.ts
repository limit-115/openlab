import path from "node:path";
import { fileURLToPath } from "node:url";
import { shippedDirectory } from "@openlab/core/lab-installation/shipped-directory";
import { ShippedDirectory } from "@openlab/core/lab-installation/shipped-directory.const";
import { BUILT_DASHBOARD_DIRECTORY } from "#src/daemon-runtime/built-dashboard.const";

/**
 * Where the dashboard the daemon serves is.
 *
 * A released lab installs the dashboard beside its executable, and that is the whole answer: the
 * daemon was bundled into that executable, so the package that owns the dashboard has no place on
 * disk left to be asked about.
 *
 * Run from the sources it does still have one, and it is asked where it is rather than walked to
 * with `..`, because a walk out of the daemon's own directory is only true while the two sit side
 * by side in one repository.
 */
export function builtDashboardRoot(): string {
    const shipped = shippedDirectory(ShippedDirectory.DASHBOARD);
    if (shipped !== undefined) {
        return shipped;
    }

    const manifest = fileURLToPath(import.meta.resolve("@openlab/dashboard/package.json"));
    return path.join(path.dirname(manifest), BUILT_DASHBOARD_DIRECTORY);
}
