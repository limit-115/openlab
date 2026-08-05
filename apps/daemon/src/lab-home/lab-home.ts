import { homedir } from "node:os";
import path from "node:path";
import { LabHomeLayout } from "#src/lab-home/lab-home.const";
import type { LabHomeEnvironment } from "#src/lab-home/lab-home.types";

/**
 * Where a lab home keeps its database. One home is one lab, so nothing names the file: pointing a
 * lab somewhere else is pointing its home somewhere else, and its runs go with it.
 */
export function labDatabasePath(labHome: string): string {
    return path.join(labHome, LabHomeLayout.DATABASE_FILE);
}

/**
 * A path that reaches the lab from a unit file, a launch agent or a JSON config was never seen by a
 * shell, so a leading tilde arrives unexpanded and would otherwise become a directory named `~`.
 */
function expandLeadingTilde(value: string): string {
    if (value === "~") {
        return homedir();
    }
    return value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}

/**
 * Where this machine's lab lives. A lab belongs to an operator, not to whichever directory the
 * daemon was started in, so `nightlab start` from another repository has to reach the same runs.
 *
 * `NIGHTLAB_HOME` decides it, then the XDG data directory, then that directory's own default — which is
 * the usual case, since almost nothing sets `XDG_DATA_HOME`. A relative `XDG_DATA_HOME` is ignored
 * as the specification demands, and ignoring it is what keeps a lab from being per-directory again.
 */
export function resolveLabHome(environment: LabHomeEnvironment): string {
    const labHome = environment.NIGHTLAB_HOME;
    if (labHome !== undefined) {
        return path.resolve(expandLeadingTilde(labHome));
    }

    const xdgDataHome = environment.XDG_DATA_HOME;
    const dataDirectory =
        xdgDataHome !== undefined && path.isAbsolute(xdgDataHome)
            ? xdgDataHome
            : path.join(homedir(), ...LabHomeLayout.XDG_DATA_SEGMENTS);

    return path.join(dataDirectory, LabHomeLayout.DIRECTORY_NAME);
}
