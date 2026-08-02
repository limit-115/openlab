import { describe, expect, it } from "vitest";
import { LabState } from "#src/lab-lifecycle/lab-state.const";
import { StatusSnapshotSchema } from "#src/lab-status/status-snapshot.schema";

describe("StatusSnapshotSchema", () => {
    it("applies empty collection defaults", () => {
        const now = new Date().toISOString();
        const status = StatusSnapshotSchema.parse({
            lab: {
                id: "lab-1",
                state: LabState.RUNNING,
                goal: "Prove a claim",
                started_at: now,
                updated_at: now,
                uptime_ms: 1
            },
            frontier: {
                updated_at: now
            }
        });

        expect(status.branches).toEqual([]);
        expect(status.frontier.open_questions).toEqual([]);
    });
});
