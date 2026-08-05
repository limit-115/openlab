import type { RunDirectoryUsage } from "@nightlab/protocol/lab-storage/lab-storage.types";
import { describe, expect, it } from "vitest";
import { formatShare, runDirectoryShares } from "#src/lab-maintenance/run-directory-share";

function directory(bytes: number): RunDirectoryUsage {
    return {
        investigation_id: `run-${bytes}`,
        goal: null,
        path: `/lab/runs/run-${bytes}`,
        bytes,
        file_count: 0
    };
}

describe("runDirectoryShares", () => {
    it("reads a directory of a lab that holds nothing as no share, not as no number", () => {
        const [empty] = runDirectoryShares([directory(0)], 0);

        expect(empty?.percent).toBe(0);
    });
});

describe("formatShare", () => {
    it("keeps a directory too small to round up to a percent from reading as none of the lab", () => {
        expect(formatShare(0.4)).toBe("<1%");
    });

    it("states a share that is nothing at all as nothing", () => {
        expect(formatShare(0)).toBe("0%");
    });
});
