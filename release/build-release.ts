import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import type { ReleaseArtifact, ReleaseManifest } from "#release/release-manifest.types";
import {
    BunCompileTarget,
    EXECUTABLE_NAME,
    ReleaseTarget,
    WINDOWS_TARGETS
} from "#release/release-target.const";

const REPOSITORY = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT = path.join(REPOSITORY, "release", "dist");
const STAGING = path.join(REPOSITORY, "release", "staging");
const ENTRY = path.join(REPOSITORY, "apps", "cli", "src", "main.ts");
const DASHBOARD_BUILD = path.join(REPOSITORY, "apps", "dashboard", "dist");
const MIGRATIONS = path.join(REPOSITORY, "packages", "db", "migrations");

/**
 * Builds every platform's release from this machine.
 *
 * A release is one executable and the two directories it reads at runtime — the dashboard it serves
 * and the migrations it brings a database up on — archived together so that installing is
 * unpacking. The manifest written beside them is what an installer reads first.
 */
async function buildRelease(): Promise<void> {
    const version = await releaseVersion();
    const targets = requestedTargets();

    await rm(STAGING, { recursive: true, force: true });
    await rm(OUTPUT, { recursive: true, force: true });
    await mkdir(OUTPUT, { recursive: true });

    report(`OpenLab ${version}, ${targets.length} target(s)`);
    await buildDashboard();

    const artifacts: Partial<Record<ReleaseTarget, ReleaseArtifact>> = {};
    for (const target of targets) {
        artifacts[target] = await buildTarget(target, version);
    }

    const manifest: ReleaseManifest = { version, artifacts };
    await writeFile(
        path.join(OUTPUT, "manifest.json"),
        `${JSON.stringify(manifest, null, 4)}\n`,
        "utf8"
    );
    await rm(STAGING, { recursive: true, force: true });

    report(`wrote ${path.relative(REPOSITORY, OUTPUT)}/manifest.json`);
}

/** The version the release is cut at, which is the one the CLI answers `--version` with. */
async function releaseVersion(): Promise<string> {
    const manifest = await readFile(path.join(REPOSITORY, "apps", "cli", "package.json"), "utf8");
    const { version } = JSON.parse(manifest) as { version?: string };
    if (version === undefined) {
        throw new Error("apps/cli/package.json states no version to release");
    }
    return version;
}

/** Which platforms this run is for: all of them, or the ones named on the command line. */
function requestedTargets(): readonly ReleaseTarget[] {
    const every = Object.values(ReleaseTarget);
    const named = process.argv.slice(2);
    if (named.length === 0) {
        return every;
    }

    const unknown = named.filter((name) => !every.includes(name as ReleaseTarget));
    if (unknown.length > 0) {
        throw new Error(
            `Unknown target(s): ${unknown.join(", ")}. Known targets are ${every.join(", ")}.`
        );
    }
    return named as ReleaseTarget[];
}

/** The dashboard is built once and copied into every platform's archive unchanged. */
async function buildDashboard(): Promise<void> {
    report("building the dashboard");
    await execa("pnpm", ["--filter", "@openlab/dashboard", "build"], {
        cwd: REPOSITORY,
        stdout: "ignore",
        stderr: "inherit"
    });
}

async function buildTarget(target: ReleaseTarget, version: string): Promise<ReleaseArtifact> {
    const onWindows = WINDOWS_TARGETS.includes(target);
    const laidOut = path.join(STAGING, target);
    await mkdir(laidOut, { recursive: true });

    report(`compiling ${target}`);
    await execa(
        "bun",
        [
            "build",
            "--compile",
            `--target=${BunCompileTarget[target]}`,
            "--outfile",
            path.join(laidOut, onWindows ? `${EXECUTABLE_NAME}.exe` : EXECUTABLE_NAME),
            ENTRY
        ],
        { cwd: REPOSITORY, stdout: "ignore", stderr: "inherit" }
    );

    await cp(DASHBOARD_BUILD, path.join(laidOut, "dashboard"), { recursive: true });
    await cp(MIGRATIONS, path.join(laidOut, "migrations"), { recursive: true });

    const file = `${EXECUTABLE_NAME}-${version}-${target}.${onWindows ? "zip" : "tar.gz"}`;
    const archive = path.join(OUTPUT, file);
    report(`archiving ${file}`);
    await archiveDirectory(laidOut, archive, onWindows);

    return { file, sha256: await digestOf(archive), size: (await stat(archive)).size };
}

/**
 * Packs a laid-out release. Windows gets a zip because that is what Explorer and PowerShell open
 * without being told how; everything else gets a gzipped tar, which preserves the executable bit
 * that makes the unpacked lab runnable.
 */
async function archiveDirectory(
    directory: string,
    archive: string,
    onWindows: boolean
): Promise<void> {
    if (onWindows) {
        await execa("zip", ["-q", "-r", archive, "."], { cwd: directory });
        return;
    }
    await execa("tar", ["-czf", archive, "-C", directory, "."]);
}

async function digestOf(file: string): Promise<string> {
    return createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
}

function report(message: string): void {
    process.stdout.write(`${message}\n`);
}

await buildRelease();
