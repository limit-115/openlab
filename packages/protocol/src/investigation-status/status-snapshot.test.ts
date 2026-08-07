import { describe, expect, it } from "vitest";
import { InvestigationState } from "#src/investigation-lifecycle/investigation-state.const";
import { StatusSnapshotSchema } from "#src/investigation-status/status-snapshot.schema";

const RUNNING_INVESTIGATION = {
    investigation: {
        id: "investigation-1",
        state: InvestigationState.RUNNING,
        goal: "Reach a breakthrough",
        started_at: "2026-08-03T00:00:00.000Z",
        updated_at: "2026-08-03T00:00:00.000Z",
        uptime_ms: 1
    }
} as const;

describe("StatusSnapshotSchema", () => {
    it("applies empty collection defaults", () => {
        const status = StatusSnapshotSchema.parse(RUNNING_INVESTIGATION);

        expect(status.leads).toEqual([]);
        expect(status.findings).toEqual([]);
        expect(status.verdicts).toEqual([]);
        expect(status.runs).toEqual([]);
    });

    it("leaves the breakthrough pointer absent while nothing has been confirmed", () => {
        const status = StatusSnapshotSchema.parse(RUNNING_INVESTIGATION);

        expect(status.breakthrough_finding_id).toBeUndefined();
    });
});
