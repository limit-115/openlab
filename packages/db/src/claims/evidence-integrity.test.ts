import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { EvidenceKind } from "@lab/protocol/constants";
import { describe, expect, it } from "vitest";
import type { AddEvidenceInput } from "#src/claims/claim-repository.types";
import { assertEvidenceIntegrity } from "#src/claims/evidence-integrity";

describe("assertEvidenceIntegrity", () => {
    it("requires an explicit artifact path and hash pair", () => {
        const evidence = makeEvidence();
        expect(() => assertEvidenceIntegrity({ ...evidence, artifactPath: "/tmp/output" })).toThrow(
            "path and hash must be recorded together"
        );
        expect(() => assertEvidenceIntegrity({ ...evidence, artifactHash: "sha256" })).toThrow(
            "path and hash must be recorded together"
        );
        expect(() =>
            assertEvidenceIntegrity({
                ...evidence,
                artifactPath: "/tmp/output",
                artifactHash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"
            })
        ).not.toThrow();
    });

    it("does not accept blank fingerprints, summaries, paths, or hashes", () => {
        const evidence = makeEvidence();
        expect(() => assertEvidenceIntegrity({ ...evidence, fingerprint: " " })).toThrow();
        expect(() => assertEvidenceIntegrity({ ...evidence, summary: " " })).toThrow();
        expect(() =>
            assertEvidenceIntegrity({ ...evidence, artifactPath: " ", artifactHash: "hash" })
        ).toThrow();
        expect(() =>
            assertEvidenceIntegrity({ ...evidence, artifactPath: "/tmp/output", artifactHash: " " })
        ).toThrow();
    });
});

function makeEvidence(): AddEvidenceInput {
    return {
        id: "evidence-1",
        labId: "lab-1",
        claimId: "claim-1",
        sourceBranchId: "branch-1",
        kind: EvidenceKind.EXPERIMENT,
        origin: EvidenceOrigin.EMPIRICAL,
        fingerprint: "experiment:1",
        summary: "Observed a controlled outcome",
        supports: true,
        valid: false,
        complete: false
    };
}
