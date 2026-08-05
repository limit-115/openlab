import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLabHome } from "#src/lab-home/lab-home";

describe("resolveLabHome", () => {
    it("gives the operator one lab instead of one per directory the daemon starts in", () => {
        expect(resolveLabHome({})).toBe(path.join(homedir(), ".local", "share", "openlab"));
    });

    it("puts the lab in the data directory the environment names", () => {
        expect(resolveLabHome({ XDG_DATA_HOME: "/opt/share" })).toBe("/opt/share/openlab");
    });

    it("ignores a relative data directory rather than resolving it against the process", () => {
        expect(resolveLabHome({ XDG_DATA_HOME: "share" })).toBe(
            path.join(homedir(), ".local", "share", "openlab")
        );
    });

    it("lets OPENLAB_HOME overrule the data directory", () => {
        expect(resolveLabHome({ OPENLAB_HOME: "/srv/lab", XDG_DATA_HOME: "/opt/share" })).toBe(
            "/srv/lab"
        );
    });

    it("expands a leading tilde no shell was there to expand", () => {
        expect(resolveLabHome({ OPENLAB_HOME: "~/labs/first" })).toBe(
            path.join(homedir(), "labs", "first")
        );
    });

    it("resolves a relative OPENLAB_HOME against the working directory", () => {
        expect(resolveLabHome({ OPENLAB_HOME: "./.openlab" })).toBe(
            path.join(process.cwd(), ".openlab")
        );
    });
});
