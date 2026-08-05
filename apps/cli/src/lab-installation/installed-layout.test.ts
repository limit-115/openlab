import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    executableName,
    installedPaths,
    launcherName,
    resolveBinDirectory
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

describe("installedPaths", () => {
    /** Two versions never share a directory, which is what makes an install reversible. */
    it("gives each version a directory of its own", () => {
        const first = installedPaths("0.1.0", {});
        const second = installedPaths("0.2.0", {});

        expect(first.version).not.toBe(second.version);
        expect(path.dirname(first.version)).toBe(path.dirname(second.version));
    });

    /** The launcher outlives any one version, so it must not sit inside one. */
    it("keeps the launcher outside the version it points at", () => {
        const paths = installedPaths("0.1.0", {
            [InstallEnvironment.INSTALL_DIRECTORY]: "/opt/bin"
        });

        expect(paths.launcher.startsWith(paths.version)).toBe(false);
        expect(paths.launcher).toBe(path.join("/opt/bin", launcherName()));
    });

    /** A lab is a directory an operator can copy or delete, which the program must stay out of. */
    it("keeps the program out of the lab's own home", () => {
        const paths = installedPaths("0.1.0", { OPENLAB_HOME: "/data/my-lab" });

        expect(paths.home.startsWith("/data/my-lab")).toBe(false);
        expect(paths.version.startsWith("/data/my-lab")).toBe(false);
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
