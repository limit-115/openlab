import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { describe, expect, it } from "vitest";
import type { CompletionEvidence } from "#src/lab-lifecycle/completion-evidence.types";
import { assessLifecycleTransition } from "#src/lab-lifecycle/lab-state-transitions";
import { WakeTrigger } from "#src/lab-lifecycle/wake-trigger.const";

const completion: CompletionEvidence = {
    resultStatement: "The result is verified",
    supportingEvidenceIds: ["evidence-1"],
    independentVerifierVerdictId: "verdict-1",
    limitations: ["Small input only"],
    knownCounterexamples: [],
    reportPath: "report.md",
    resultPath: "result.json"
};

describe("lab lifecycle", () => {
    it("requires every completion artifact and independent verification", () => {
        expect(
            assessLifecycleTransition(LabState.RUNNING, LabState.COMPLETED, { completion }).allowed
        ).toBe(true);
        expect(
            assessLifecycleTransition(LabState.RUNNING, LabState.COMPLETED, {
                completion: {
                    resultStatement: completion.resultStatement,
                    supportingEvidenceIds: completion.supportingEvidenceIds,
                    limitations: completion.limitations,
                    knownCounterexamples: completion.knownCounterexamples,
                    reportPath: "report.md",
                    resultPath: "result.json"
                }
            }).allowed
        ).toBe(false);
    });

    it("hibernates only at a confirmed plateau and wakes on a trigger", () => {
        expect(assessLifecycleTransition(LabState.RUNNING, LabState.HIBERNATING).allowed).toBe(
            false
        );
        expect(
            assessLifecycleTransition(LabState.RUNNING, LabState.HIBERNATING, {
                plateauConfirmed: true
            }).allowed
        ).toBe(true);
        expect(assessLifecycleTransition(LabState.HIBERNATING, LabState.RUNNING).allowed).toBe(
            false
        );
        expect(
            assessLifecycleTransition(LabState.HIBERNATING, LabState.RUNNING, {
                wakeTrigger: WakeTrigger.EVIDENCE
            }).allowed
        ).toBe(true);
    });
});
