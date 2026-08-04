import path from "node:path";

/**
 * Every run directory the lab writes to has to sit inside LAB_HOME. A persisted path that points
 * outside it is either a home that moved or a record from another machine, and opening it would
 * write a run into a directory the operator never handed over.
 */
export function resolveRunDirectory(workspaceRoot: string, runDirectory: string): string {
    const root = path.resolve(workspaceRoot);
    const resolvedRunDirectory = path.resolve(runDirectory);
    const relativeRunDirectory = path.relative(root, resolvedRunDirectory);
    if (
        relativeRunDirectory.length === 0 ||
        relativeRunDirectory === ".." ||
        relativeRunDirectory.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeRunDirectory)
    ) {
        throw new Error("Run directory escapes LAB_HOME");
    }
    return resolvedRunDirectory;
}
