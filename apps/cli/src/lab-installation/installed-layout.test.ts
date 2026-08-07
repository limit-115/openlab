import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    executableName,
    launcherName,
    programPaths,
    resolveBinDirectory,
    versionDirectory
} from "#src/lab-installation/installed-layout";
import { InstallEnvironment, InstalledLayout } from "#src/lab-installation/installed-layout.const";

describe("resolveBinDirectory", () => {
    it("obeys the directory an operator named", () => {
        const named = resolveBinDirectory({
            [InstallEnvironment.INSTALL_DIRECTORY]: "/opt/lab/bin"
        });

        expect(named).toBe("/opt/lab/bin");
    });

    it("expands a leading tilde nothing else was going to expand", () => {
        const named = resolveBinDirectory({ [InstallEnvironment.INSTALL_DIRECTORY]: "~/tools" });

        expect(named).toBe(path.join(homedir(), "tools"));
    });

    /** A variable set to nothing is an operator who set nothing, not one who asked for the empty path. */
    it("treats an empty variable as unset", () => {
        const empty = resolveBinDirectory({ [InstallEnvironment.INSTALL_DIRECTORY]: "  " });

        expect(empty).toBe(path.join(homedir(), InstalledLayout.FALLBACK_BIN_DIRECTORY));
    });

    /** The specification says a relative XDG path is to be ignored, and ignoring it keeps the
     * launcher out of whichever directory the installer happened to be run from. */
    it("ignores a relative XDG_BIN_HOME as the specification asks", () => {
        const relative = resolveBinDirectory({ [InstallEnvironment.XDG_BIN_HOME]: "bin" });

        expect(relative).toBe(path.join(homedir(), InstalledLayout.FALLBACK_BIN_DIRECTORY));
    });

    it("prefers what the operator named over the XDG directory", () => {
        const both = resolveBinDirectory({
            [InstallEnvironment.INSTALL_DIRECTORY]: "/opt/lab/bin",
            [InstallEnvironment.XDG_BIN_HOME]: "/xdg/bin"
        });

        expect(both).toBe("/opt/lab/bin");
    });
});

describe("where the program keeps itself", () => {
    /** Two versions never share a directory, which is what makes an install reversible. */
    it("gives each version a directory of its own under the one it keeps them in", () => {
        const paths = programPaths({});

        const first = versionDirectory(paths, "0.1.0");
        const second = versionDirectory(paths, "0.2.0");
        expect(first).not.toBe(second);
        expect(path.dirname(first)).toBe(paths.versions);
    });

    /** The launcher outlives any one version, so it must not sit inside one. */
    it("keeps the launcher outside the versions it points into", () => {
        const paths = programPaths({ [InstallEnvironment.INSTALL_DIRECTORY]: "/opt/bin" });

        expect(paths.launcher.startsWith(paths.versions)).toBe(false);
        expect(paths.launcher).toBe(path.join("/opt/bin", launcherName()));
    });

    /**
     * The receipt and the remembered answer from the channel are the program's, not a version's,
     * and an update that replaces every version must not take either with it.
     */
    it("keeps what outlives a version out of every version", () => {
        const paths = programPaths({});

        expect(paths.receipt.startsWith(paths.versions)).toBe(false);
        expect(paths.updateCheck.startsWith(paths.versions)).toBe(false);
    });

    /** A lab is a directory an operator can copy or delete, which the program must stay out of. */
    it("keeps the program out of the lab's own home", () => {
        const paths = programPaths({ OPENLAB_HOME: "/data/my-lab" });

        expect(paths.home.startsWith("/data/my-lab")).toBe(false);
        expect(paths.versions.startsWith("/data/my-lab")).toBe(false);
    });
});

describe("what the operator types and what answers it", () => {
    it("names a Windows launcher something Windows will run", () => {
        expect(launcherName("win32")).toBe("openlab.cmd");
        expect(executableName("win32")).toBe("openlab.exe");
    });

    it("names them plainly everywhere else", () => {
        expect(launcherName("darwin")).toBe("openlab");
        expect(executableName("linux")).toBe("openlab");
    });
});
