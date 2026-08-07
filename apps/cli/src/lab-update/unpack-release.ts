import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { executableName } from "#src/lab-installation/installed-layout";
import { UpdateError } from "#src/lab-update/update-error";

/**
 * Unpacks a release archive into a directory laid out the way an install expects to find one.
 *
 * One command reads every archive a release publishes. On macOS and on Windows `tar` is bsdtar,
 * which reads a zip as readily as a gzipped tar; on Linux it is GNU tar, which only ever receives
 * the gzipped tar and works out the compression itself. Nothing here has to know which platform it
 * is on, or which format that platform's release happens to be packed in.
 */
export async function unpackRelease(archive: string, into: string): Promise<string> {
    await mkdir(into, { recursive: true });
    await execa(tarCommand(), ["-xf", archive, "-C", into]).catch(() => {
        throw new UpdateError(`Could not unpack ${path.basename(archive)}. Nothing was installed.`);
    });

    if (!existsSync(path.join(into, executableName()))) {
        throw new UpdateError(
            `${path.basename(archive)} holds no ${executableName()} executable. Nothing was installed.`
        );
    }
    return into;
}

/**
 * Which `tar` the archive is handed to.
 *
 * Everywhere but Windows this is whatever `tar` the machine has, and every one of them reads the
 * gzipped tar those platforms are published as. Windows has shipped bsdtar as part of the system
 * since Windows 10 1803, and bsdtar is what reads the zip Windows is published as — but it is asked
 * for by its full path rather than looked up, because a Windows machine with Git installed has GNU
 * tar ahead of it on `PATH`, and GNU tar does not read a zip at all.
 */
function tarCommand(): string {
    if (process.platform !== "win32") {
        return "tar";
    }
    const system = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
    return existsSync(system) ? system : "tar";
}
