import { describe, expect, it } from "vitest";
import { LabState } from "#src/lab-lifecycle/lab-state.const";
import { StatusSnapshotSchema } from "#src/lab-status/status-snapshot.schema";

const RUNNING_LAB = {
    lab: {
        id: "lab-1",
        state: LabState.RUNNING,
        goal: "Reach a breakthrough",
        started_at: "2026-08-03T00:00:00.000Z",
        updated_at: "2026-08-03T00:00:00.000Z",
        uptime_ms: 1
    }
} as const;

describe("StatusSnapshotSchema", () => {
    it("applies empty collection defaults", () => {
        const status = StatusSnapshotSchema.parse(RUNNING_LAB);

        expect(status.assumptions).toEqual([]);
        expect(status.findings).toEqual([]);
        expect(status.verdicts).toEqual([]);
        expect(status.runs).toEqual([]);
    });

    it("leaves the breakthrough pointer absent while nothing has been confirmed", () => {
        const status = StatusSnapshotSchema.parse(RUNNING_LAB);

        expect(status.breakthrough_finding_id).toBeUndefined();
    });
});
