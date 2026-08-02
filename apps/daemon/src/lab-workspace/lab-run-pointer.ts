import { readFile } from "node:fs/promises";
import path from "node:path";
import writeFileAtomic from "write-file-atomic";

export const CurrentPointerStatus = {
    VALID: "valid",
    MISSING: "missing",
    INVALID: "invalid"
} as const;

export interface CurrentPointer {
    readonly lab_id: string;
    readonly run_directory: string;
}

export type CurrentPointerResult =
    | { readonly status: typeof CurrentPointerStatus.VALID; readonly pointer: CurrentPointer }
    | { readonly status: typeof CurrentPointerStatus.MISSING }
    | { readonly status: typeof CurrentPointerStatus.INVALID; readonly error: Error };

export async function readCurrentPointer(workspaceRoot: string): Promise<CurrentPointerResult> {
    try {
        const source = await readFile(path.join(workspaceRoot, "current.json"), "utf8");
        const value: unknown = JSON.parse(source);
        if (
            typeof value !== "object" ||
            value === null ||
            !("lab_id" in value) ||
            !("run_directory" in value) ||
            typeof value.lab_id !== "string" ||
            typeof value.run_directory !== "string"
        ) {
            throw new Error("Invalid current.json pointer");
        }
        return {
            status: CurrentPointerStatus.VALID,
            pointer: { lab_id: value.lab_id, run_directory: value.run_directory }
        };
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return { status: CurrentPointerStatus.MISSING };
        }
        return {
            status: CurrentPointerStatus.INVALID,
            error: error instanceof Error ? error : new Error("Invalid current.json pointer")
        };
    }
}

export function writeCurrentPointer(workspaceRoot: string, pointer: CurrentPointer): Promise<void> {
    return writeFileAtomic(
        path.join(workspaceRoot, "current.json"),
        `${JSON.stringify(pointer, null, 4)}\n`
    );
}

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
        throw new Error("Current run directory escapes LAB_HOME");
    }
    return resolvedRunDirectory;
}
