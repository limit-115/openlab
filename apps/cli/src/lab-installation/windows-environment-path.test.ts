import { describe, expect, it } from "vitest";
import { withDirectory, withoutDirectory } from "#src/lab-installation/windows-environment-path";

const BIN = "C:\\Users\\Ada\\.local\\bin";

/** A PATH of the operator's, holding an entry written with a variable rather than a path. */
const THEIRS = "C:\\Program Files\\Git\\cmd;%USERPROFILE%\\scoop\\shims";

describe("adding the launcher's directory to a Windows PATH", () => {
    /** In front, so a lab installed here answers `openlab` rather than another copy further down. */
    it("puts the directory ahead of what was already there", () => {
        expect(withDirectory(THEIRS, BIN)).toBe(`${BIN};${THEIRS}`);
    });

    /**
     * The value is written back exactly as it was read, unexpanded. Expanding it here is how one
     * machine's answer for `%USERPROFILE%` ends up baked into the operator's environment for good.
     */
    it("carries every entry of the operator's through untouched", () => {
        expect(withDirectory(THEIRS, BIN)).toContain("%USERPROFILE%\\scoop\\shims");
    });

    it("adds nothing when the directory is already there under another case", () => {
        expect(withDirectory("c:\\users\\ada\\.local\\bin", BIN)).toBeUndefined();
    });

    it("adds nothing when the directory is already there with a separator on the end", () => {
        expect(withDirectory(`${BIN}\\`, BIN)).toBeUndefined();
    });

    /** A PATH written with a stray separator holds an entry that names nothing, and it is not kept. */
    it("drops the empty entries a stray separator leaves", () => {
        expect(withDirectory("C:\\Windows;;", BIN)).toBe(`${BIN};C:\\Windows`);
    });
});

describe("taking the launcher's directory back off a Windows PATH", () => {
    it("takes out its own entry and leaves the rest in the order they were in", () => {
        expect(withoutDirectory(`${THEIRS};${BIN}`, BIN)).toBe(THEIRS);
    });

    /** An uninstall that compared exactly would leave behind the entry the install wrote. */
    it("takes out an entry that differs only in case", () => {
        expect(withoutDirectory(`c:\\users\\ada\\.local\\bin;C:\\Windows`, BIN)).toBe(
            "C:\\Windows"
        );
    });

    /** Writing an unchanged PATH back would tell every window on the desktop about nothing. */
    it("changes nothing when the directory was never there", () => {
        expect(withoutDirectory(THEIRS, BIN)).toBeUndefined();
    });
});
