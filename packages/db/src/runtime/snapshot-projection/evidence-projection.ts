import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { EvidenceRelationship } from "#src/claims/evidence-relationship.const";
import { claimEvidence, evidence } from "#src/lab-database/lab-schema";
import { evidenceFingerprint } from "#src/runtime/snapshot-projection/evidence-fingerprint";
import {
    EvidenceIntegrity,
    UnboundEvidenceOrigin
} from "#src/runtime/snapshot-projection/evidence-projection.const";
import { assertUpserted, idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertEvidence(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    for (const candidate of evidenceRecords) {
        const projection = projectEvidence(snapshot, candidate);
        const records = await database
            .insert(evidence)
            .values(projection)
            .onConflictDoUpdate({
                target: evidence.id,
                set: {
                    sourceBranchId: projection.sourceBranchId,
                    attemptId: projection.attemptId ?? null,
                    kind: projection.kind,
                    origin: projection.origin,
                    fingerprint: projection.fingerprint,
                    runId: projection.runId ?? null,
                    artifactPath: projection.artifactPath ?? null,
                    artifactHash: projection.artifactHash ?? null,
                    summary: projection.summary,
                    independent: projection.independent,
                    valid: projection.valid,
                    complete: projection.complete,
                    reproducible: projection.reproducible,
                    createdAt: projection.createdAt
                },
                setWhere: eq(evidence.labId, snapshot.lab.id)
            })
            .returning({ id: evidence.id });
        assertUpserted(records, "evidence", candidate.id);
    }
}

export async function replaceClaimEvidence(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    const claimIds = idsOf(snapshot.claims);
    if (claimIds.length === 0) {
        return;
    }
    await database.delete(claimEvidence).where(inArray(claimEvidence.claimId, claimIds));
    if (evidenceRecords.length === 0) {
        return;
    }
    await database.insert(claimEvidence).values(
        evidenceRecords.map((candidate) => ({
            claimId: candidate.claim_id,
            evidenceId: candidate.id,
            relationship: candidate.supports
                ? EvidenceRelationship.SUPPORTS
                : EvidenceRelationship.CONTRADICTS
        }))
    );
}

export async function deleteMissingEvidence(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(evidence)
        .where(
            ids.length === 0
                ? eq(evidence.labId, labId)
                : and(eq(evidence.labId, labId), notInArray(evidence.id, ids))
        );
}

function projectEvidence(snapshot: StatusSnapshot, candidate: Evidence) {
    const claim = snapshot.claims.find(({ id }) => id === candidate.claim_id);
    if (claim === undefined) {
        throw new Error(`Evidence ${candidate.id} references missing claim ${candidate.claim_id}`);
    }
    const experiment = snapshot.experiments.find(({ id }) => id === candidate.run_id);
    const experimentTask = snapshot.tasks.find(({ id }) => id === experiment?.task_id);
    const runTask = snapshot.tasks.find(({ id }) => id === candidate.run_id);
    const sourceTask = experimentTask ?? runTask;
    const sourceBranchId = sourceTask?.branch_id ?? claim.branch_id;
    const hasArtifactPair =
        candidate.artifact_path !== undefined && candidate.artifact_hash !== undefined;
    const valid =
        hasArtifactPair && EvidenceIntegrity.SHA256_PATTERN.test(candidate.artifact_hash ?? "");
    const verifierOriginEstablished =
        candidate.kind === EvidenceKind.VERIFIER_RESULT &&
        candidate.independent &&
        sourceTask?.role === AgentRole.VERIFIER &&
        sourceBranchId !== claim.branch_id;
    const empiricalOriginEstablished =
        experiment !== undefined && valid && candidate.kind !== EvidenceKind.VERIFIER_RESULT;
    const origin = verifierOriginEstablished
        ? EvidenceOrigin.VERIFIER
        : empiricalOriginEstablished
          ? EvidenceOrigin.EMPIRICAL
          : UnboundEvidenceOrigin[candidate.kind];

    return {
        id: candidate.id,
        labId: snapshot.lab.id,
        sourceBranchId,
        attemptId: experiment?.id,
        kind: candidate.kind,
        origin,
        fingerprint: evidenceFingerprint(candidate),
        runId: candidate.run_id,
        artifactPath: candidate.artifact_path,
        artifactHash: candidate.artifact_hash,
        summary: candidate.summary,
        independent: candidate.independent,
        valid,
        complete: hasArtifactPair,
        reproducible:
            candidate.kind === EvidenceKind.VERIFIER_RESULT &&
            candidate.supports &&
            candidate.independent &&
            sourceTask?.role === AgentRole.VERIFIER &&
            origin === EvidenceOrigin.VERIFIER &&
            valid,
        createdAt: new Date(candidate.created_at)
    };
}
