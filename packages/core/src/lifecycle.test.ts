import { describe, expect, it } from "vitest";
import { assessLifecycleTransition, type CompletionEvidence } from "#src/lifecycle";

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
        expect(assessLifecycleTransition("RUNNING", "COMPLETED", { completion }).allowed).toBe(
            true
        );
        expect(
            assessLifecycleTransition("RUNNING", "COMPLETED", {
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
        expect(assessLifecycleTransition("RUNNING", "HIBERNATING").allowed).toBe(false);
        expect(
            assessLifecycleTransition("RUNNING", "HIBERNATING", { plateauConfirmed: true }).allowed
        ).toBe(true);
        expect(assessLifecycleTransition("HIBERNATING", "RUNNING").allowed).toBe(false);
        expect(
            assessLifecycleTransition("HIBERNATING", "RUNNING", { wakeTrigger: "evidence" }).allowed
        ).toBe(true);
    });
});
