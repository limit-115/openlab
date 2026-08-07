import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { readInstallReceipt } from "#src/lab-installation/install-receipt";
import type { ProgramPaths } from "#src/lab-installation/installed-layout";
import { isOnPath } from "#src/lab-installation/path-entry";

/** What a harness costs an operator to fix: the command they have to have, and whether they do. */
export interface HarnessReadiness {
    readonly kind: AgentHarnessKind;
    readonly command: string;
    readonly found: string | undefined;
}

/** Everything `doctor` answers, gathered before anything is printed. */
export interface InstallationReport {
    readonly runningVersion: string;
    readonly installedVersion: string | undefined;
    readonly versionDirectory: string | undefined;
    readonly launcher: string | undefined;
    readonly launcherOnPath: boolean;
    readonly binDirectory: string;
    readonly labHome: string;
    readonly harnesses: readonly HarnessReadiness[];
}

/** Which command each harness is invoked as, which is what has to be on the operator's `PATH`. */
const HARNESS_COMMAND = {
    [AgentHarnessKind.CODEX]: "codex",
    [AgentHarnessKind.CLAUDE]: "claude",
    [AgentHarnessKind.GLM]: "claude",
    [AgentHarnessKind.DEEPSEEK]: "codex",
    [AgentHarnessKind.MUSE]: "muse"
} as const satisfies Record<AgentHarnessKind, string>;

/**
 * Everything a lab can say about its own installation without being asked twice.
 *
 * A lab that will not start is nearly always one of three things: it is not on `PATH`, it has no
 * authenticated harness to dispatch to, or the version answering is not the version installed.
 * All three are read here so the answer is one command rather than a hunt.
 */
export async function reportInstallation(
    runningVersion: string,
    paths: ProgramPaths,
    labHome: string,
    environment = process.env
): Promise<InstallationReport> {
    const receipt = await readInstallReceipt(paths.receipt);

    return {
        runningVersion,
        installedVersion: receipt?.version,
        versionDirectory: receipt?.version_directory,
        launcher: receipt?.launcher,
        launcherOnPath: isOnPath(paths.binDirectory, environment),
        binDirectory: paths.binDirectory,
        labHome,
        harnesses: await Promise.all(
            Object.values(AgentHarnessKind).map((kind) => findHarness(kind, environment))
        )
    };
}

async function findHarness(
    kind: AgentHarnessKind,
    environment: NodeJS.ProcessEnv
): Promise<HarnessReadiness> {
    const command = HARNESS_COMMAND[kind];
    return { kind, command, found: await whichCommand(command, environment) };
}

/**
 * Where a command would be found from, or nothing when it would not be.
 *
 * `PATH` is walked here rather than handed to a shell, because the lab starts its harnesses as
 * processes and not through a shell, and a shell's own aliases and functions would answer for
 * commands that a spawned process will not find.
 */
async function whichCommand(
    command: string,
    environment: NodeJS.ProcessEnv
): Promise<string | undefined> {
    const entries = (environment.PATH ?? "").split(path.delimiter).filter((entry) => entry !== "");
    const suffixes =
        process.platform === "win32"
            ? (environment.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")
            : [""];

    for (const entry of entries) {
        for (const suffix of suffixes) {
            const candidate = path.join(entry, `${command}${suffix}`);
            if (await isExecutableFile(candidate)) {
                return candidate;
            }
        }
    }
    return undefined;
}

async function isExecutableFile(candidate: string): Promise<boolean> {
    try {
        if (!(await stat(candidate)).isFile()) {
            return false;
        }
        await access(candidate, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}
