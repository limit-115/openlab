import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { describe, expect, it } from "vitest";
import { assessLifecycleTransition } from "#src/investigation-lifecycle/investigation-state-transitions";
import { WakeTrigger } from "#src/investigation-lifecycle/wake-trigger.const";

describe("investigation lifecycle", () => {
    it("declares a breakthrough only for a finding a verifier confirmed", () => {
        expect(
            assessLifecycleTransition(InvestigationState.RUNNING, InvestigationState.BREAKTHROUGH)
                .allowed
        ).toBe(false);
        expect(
            assessLifecycleTransition(InvestigationState.RUNNING, InvestigationState.BREAKTHROUGH, {
                confirmedFindingId: "finding-1"
            }).allowed
        ).toBe(true);
    });

    it("resumes a settled investigation only on a trigger", () => {
        expect(
            assessLifecycleTransition(InvestigationState.HIBERNATING, InvestigationState.RUNNING)
                .allowed
        ).toBe(false);
        expect(
            assessLifecycleTransition(InvestigationState.BREAKTHROUGH, InvestigationState.RUNNING)
                .allowed
        ).toBe(false);
        expect(
            assessLifecycleTransition(InvestigationState.STOPPED, InvestigationState.RUNNING)
                .allowed
        ).toBe(false);
        expect(
            assessLifecycleTransition(InvestigationState.HIBERNATING, InvestigationState.RUNNING, {
                wakeTrigger: WakeTrigger.CAPABILITY
            }).allowed
        ).toBe(true);
        expect(
            assessLifecycleTransition(InvestigationState.BREAKTHROUGH, InvestigationState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(true);
    });

    it("starts a stopped run again and leaves only a failure final", () => {
        expect(
            assessLifecycleTransition(InvestigationState.STOPPED, InvestigationState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(true);
        expect(
            assessLifecycleTransition(InvestigationState.FAILED, InvestigationState.RUNNING, {
                wakeTrigger: WakeTrigger.USER
            }).allowed
        ).toBe(false);
    });

    it("hibernates without ceremony", () => {
        expect(
            assessLifecycleTransition(InvestigationState.RUNNING, InvestigationState.HIBERNATING)
                .allowed
        ).toBe(true);
    });
});
