import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILT_DASHBOARD_DIRECTORY } from "#src/daemon-runtime/built-dashboard.const";

/**
 * Where the dashboard package keeps what its build wrote.
 *
 * The package is asked where it is rather than walked to with `..`, because a walk out of the
 * daemon's own directory is only true while the two sit side by side in one repository. Installed
 * as a dependency, the dashboard is wherever the installer put it, and only the resolver knows.
 */
export function builtDashboardRoot(): string {
    const manifest = fileURLToPath(import.meta.resolve("@lab/dashboard/package.json"));
    return path.join(path.dirname(manifest), BUILT_DASHBOARD_DIRECTORY);
}
