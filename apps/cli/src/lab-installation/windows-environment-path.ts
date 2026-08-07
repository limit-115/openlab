import { execa } from "execa";
import {
    READ_WINDOWS_PATH,
    WINDOWS_PATH_SEPARATOR,
    WindowsPathKind,
    WindowsPathVariable,
    WRITE_WINDOWS_PATH
} from "#src/lab-installation/windows-environment-path.const";

/** The user's `PATH` as the registry holds it, together with the kind it is held as. */
interface WindowsPath {
    readonly path: string;
    readonly kind: WindowsPathKind;
}

/**
 * Puts a directory on the `PATH` every terminal this user opens from now on will have.
 *
 * Answers whether anything had to change, so an install can tell an operator whose `PATH` already
 * reached the launcher that nothing of theirs was touched.
 */
export async function putOnWindowsPath(binDirectory: string): Promise<boolean> {
    const held = await windowsPath();
    const updated = withDirectory(held.path, binDirectory);
    if (updated === undefined) {
        return false;
    }

    await writeWindowsPath(updated, held.kind);
    return true;
}

/** Takes that directory back out, leaving every other entry of the operator's where it was. */
export async function takeOffWindowsPath(binDirectory: string): Promise<boolean> {
    const held = await windowsPath();
    const updated = withoutDirectory(held.path, binDirectory);
    if (updated === undefined) {
        return false;
    }

    await writeWindowsPath(updated, held.kind);
    return true;
}

/**
 * The `PATH` with this directory in front of it, or nothing at all when it is already there.
 *
 * In front, because a lab installed here is the one that should answer `openlab` rather than
 * whichever other copy an operator happens to have further down.
 */
export function withDirectory(existing: string, directory: string): string | undefined {
    const entries = entriesOf(existing);
    if (entries.some((entry) => namesTheSameDirectory(entry, directory))) {
        return undefined;
    }
    return [directory, ...entries].join(WINDOWS_PATH_SEPARATOR);
}

/** The `PATH` without this directory, or nothing at all when it was not on it to begin with. */
export function withoutDirectory(existing: string, directory: string): string | undefined {
    const entries = entriesOf(existing);
    const kept = entries.filter((entry) => !namesTheSameDirectory(entry, directory));

    return kept.length === entries.length ? undefined : kept.join(WINDOWS_PATH_SEPARATOR);
}

/**
 * Whether two entries name the same directory.
 *
 * Windows finds a file whatever case its path was asked for in, so an operator who already has
 * `C:\\Users\\Ada\\.local\\bin` is not to be given `c:\\users\\ada\\.local\\bin` beside it — and an
 * uninstall that compared exactly would leave the entry it wrote behind. A trailing separator is
 * not a different directory either, and it is written by hand often enough to matter.
 */
function namesTheSameDirectory(one: string, other: string): boolean {
    return settled(one) === settled(other);
}

function settled(entry: string): string {
    return entry
        .trim()
        .replace(/[\\/]+$/, "")
        .toLowerCase();
}

/** An empty entry is what a `PATH` written with a stray separator leaves, and it names nothing. */
function entriesOf(existing: string): readonly string[] {
    return existing.split(WINDOWS_PATH_SEPARATOR).filter((entry) => entry.trim() !== "");
}

async function windowsPath(): Promise<WindowsPath> {
    const answered = JSON.parse(await runScript(READ_WINDOWS_PATH)) as WindowsPath;
    return {
        path: answered.path,
        kind:
            answered.kind === WindowsPathKind.PLAIN
                ? WindowsPathKind.PLAIN
                : WindowsPathKind.EXPANDABLE
    };
}

async function writeWindowsPath(value: string, kind: WindowsPathKind): Promise<void> {
    await runScript(WRITE_WINDOWS_PATH, {
        [WindowsPathVariable.VALUE]: value,
        [WindowsPathVariable.KIND]: kind
    });
}

/**
 * Runs a script through the PowerShell that ships with every supported Windows.
 *
 * It is handed over encoded rather than as a command line, because a script that edits `PATH` holds
 * both quote characters and every path separator, and there is no quoting of it that is right on
 * both the shell's terms and PowerShell's. `-NoProfile` so that nothing an operator put in their own
 * profile can change what an install does.
 */
async function runScript(script: string, environment: NodeJS.ProcessEnv = {}): Promise<string> {
    const { stdout } = await execa(
        "powershell",
        [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            Buffer.from(script, "utf16le").toString("base64")
        ],
        { env: environment, extendEnv: true }
    );
    return stdout;
}
