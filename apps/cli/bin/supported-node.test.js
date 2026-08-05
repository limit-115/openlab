import { describe, expect, it } from "vitest";
import { REQUIRED_NODE_VERSION, unsupportedNodeMessage } from "#bin/supported-node.js";

describe("unsupportedNodeMessage", () => {
    it("names both the Node the lab needs and the one the operator has", () => {
        const message = unsupportedNodeMessage("20.11.0");

        expect(message).toContain(REQUIRED_NODE_VERSION);
        expect(message).toContain("20.11.0");
        expect(message).toContain("nodejs.org");
    });

    /** Type stripping and the SQLite the lab opens arrived within the major, not at the start of it. */
    it("refuses a Node from the right major that is still older than the lab needs", () => {
        expect(unsupportedNodeMessage("24.4.0")).toBeDefined();
    });

    it("lets through the Node the lab is pinned to and anything after it", () => {
        expect(unsupportedNodeMessage(REQUIRED_NODE_VERSION)).toBeUndefined();
        expect(unsupportedNodeMessage("24.19.0")).toBeUndefined();
        expect(unsupportedNodeMessage("26.1.2")).toBeUndefined();
    });

    /** A nightly is working towards a release it has not reached, so it is read as not yet there. */
    it("refuses a prerelease of the major the lab needs", () => {
        expect(unsupportedNodeMessage("24.0.0-nightly20260101")).toBeDefined();
    });
});
