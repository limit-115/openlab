import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { describe, expect, it } from "vitest";
import { assessLifecycleTransition } from "#src/lab-lifecycle/lab-state-transitions";
import { WakeTrigger } from "#src/lab-lifecycle/wake-trigger.const";

describe("lab lifecycle", () => {
    it("declares a breakthrough only for a finding a verifier confirmed", () => {
        expect(assessLifecycleTransition(LabState.RUNNING, LabState.BREAKTHROUGH).allowed).toBe(
            false
        );
        expect(
            assessLifecycleTransition(LabState.RUNNING, LabState.BREAKTHROUGH, {
                confirmedFindingId: "finding-1"
            }).allowed
        ).toBe(true);
    });

    it("resumes a settled lab only on a trigger", () => {
        expect(assessLifecycleTransition(LabState.HIBERNATING, LabState.RUNNING).allowed).toBe(
            false
        );
        expect(assessLifecycleTransition(LabState.BREAKTHROUGH, LabState.RUNNING).allowed).toBe(
            false
        );
        expect(assessLifecycleTransition(LabState.STOPPED, LabState.RUNNING).allowed).toBe(false);
        expect(
            assessLifecycleTransition(LabState.HIBERNATING, LabState.RUNNING, {
                wakeTrigger: WakeTrigger.CAPABILITY
            }).allowed
        ).toBe(true);
        expect(
            assessLifecycleTransition(LabState.BREAKTHROUGH, LabState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(true);
    });

    it("starts a stopped run again and leaves only a failure final", () => {
        expect(
            assessLifecycleTransition(LabState.STOPPED, LabState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(true);
        expect(
            assessLifecycleTransition(LabState.FAILED, LabState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(false);
    });

    it("hibernates without ceremony", () => {
        expect(assessLifecycleTransition(LabState.RUNNING, LabState.HIBERNATING).allowed).toBe(
            true
        );
    });
});
