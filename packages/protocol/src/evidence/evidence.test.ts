import { describe, expect, it } from "vitest";
import { EvidenceSchema } from "#src/evidence/evidence.schema";
import { EvidenceKind } from "#src/evidence/evidence-kind.const";
import { SourceClassification, SourceRetrievalMethod } from "#src/evidence/source-evidence.const";

describe("EvidenceSchema", () => {
    const sourceEvidence = {
        id: "evidence-source-1",
        kind: EvidenceKind.SOURCE,
        claim_id: "claim-1",
        run_id: "experiment-source-1",
        artifact_path: "/tmp/source-body",
        artifact_hash: "a".repeat(64),
        summary: "Daemon-fetched citation",
        supports: false,
        independent: false,
        source: {
            requested_url: "https://example.com/paper",
            final_url: "https://example.com/paper",
            title: "Example paper",
            claimed_classification: SourceClassification.PRIMARY,
            retrieval_method: SourceRetrievalMethod.DAEMON_HTTP,
            http_status: 200,
            fetched_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
    } as const;

    it("requires daemon metadata and keeps citations non-supporting", () => {
        expect(EvidenceSchema.parse(sourceEvidence)).toEqual(sourceEvidence);
        expect(() => EvidenceSchema.parse({ ...sourceEvidence, source: undefined })).toThrow(
            "daemon retrieval metadata"
        );
        expect(() => EvidenceSchema.parse({ ...sourceEvidence, supports: true })).toThrow(
            "cannot independently support"
        );
    });

    it("rejects source metadata on non-source evidence", () => {
        expect(() =>
            EvidenceSchema.parse({
                ...sourceEvidence,
                kind: EvidenceKind.ARTIFACT
            })
        ).toThrow("Only source evidence");
    });
});
