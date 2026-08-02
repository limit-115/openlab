import { type AssessedEvidence, type EvidenceOrigin, transitionClaim } from "@lab/core/claims";
import type { Claim, ClaimStatus, Evidence } from "@lab/protocol/schemas";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "#src/client";
import { claimDependencies, claimEvidence, claims, evidence } from "#src/schema";

export interface CreateClaimInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId: string;
    readonly statement: string;
    readonly universal?: boolean;
    readonly dependencyIds?: readonly string[];
    readonly now?: Date;
}

export interface AddEvidenceInput {
    readonly id: string;
    readonly labId: string;
    readonly claimId: string;
    readonly sourceBranchId: string;
    readonly attemptId?: string;
    readonly kind: Evidence["kind"];
    readonly origin: EvidenceOrigin;
    readonly fingerprint: string;
    readonly runId?: string;
    readonly artifactPath?: string;
    readonly artifactHash?: string;
    readonly summary: string;
    readonly supports: boolean;
    readonly independent?: boolean;
    readonly valid?: boolean;
    readonly complete?: boolean;
    readonly reproducible?: boolean;
    readonly now?: Date;
}

export class ClaimRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async create(input: CreateClaimInput): Promise<Claim> {
        const now = input.now ?? new Date();
        return this.#database.transaction(async (transaction) => {
            const [record] = await transaction
                .insert(claims)
                .values({
                    id: input.id,
                    labId: input.labId,
                    branchId: input.branchId,
                    statement: input.statement,
                    universal: input.universal ?? false,
                    createdAt: now,
                    updatedAt: now
                })
                .returning();
            if (record === undefined) {
                throw new Error(`Failed to create claim ${input.id}`);
            }
            const dependencyIds = [...new Set(input.dependencyIds ?? [])];
            if (dependencyIds.includes(input.id)) {
                throw new Error("A claim cannot depend on itself");
            }
            if (dependencyIds.length > 0) {
                await transaction.insert(claimDependencies).values(
                    dependencyIds.map((dependencyId) => ({
                        claimId: input.id,
                        dependencyId
                    }))
                );
            }
            return toClaim(record, dependencyIds, [], []);
        });
    }

    async addEvidence(input: AddEvidenceInput): Promise<void> {
        const now = input.now ?? new Date();
        await this.#database.transaction(async (transaction) => {
            await transaction
                .insert(evidence)
                .values({
                    id: input.id,
                    labId: input.labId,
                    sourceBranchId: input.sourceBranchId,
                    attemptId: input.attemptId,
                    kind: input.kind,
                    origin: input.origin,
                    fingerprint: input.fingerprint,
                    runId: input.runId,
                    artifactPath: input.artifactPath,
                    artifactHash: input.artifactHash,
                    summary: input.summary,
                    independent: input.independent ?? false,
                    valid: input.valid ?? true,
                    complete: input.complete ?? true,
                    reproducible: input.reproducible ?? false,
                    createdAt: now
                })
                .onConflictDoNothing({ target: [evidence.labId, evidence.fingerprint] });

            const stored = await transaction.query.evidence.findFirst({
                where: and(
                    eq(evidence.labId, input.labId),
                    eq(evidence.fingerprint, input.fingerprint)
                )
            });
            if (stored === undefined) {
                throw new Error(`Failed to store evidence ${input.id}`);
            }
            await transaction
                .insert(claimEvidence)
                .values({
                    claimId: input.claimId,
                    evidenceId: stored.id,
                    relationship: input.supports ? "supports" : "contradicts"
                })
                .onConflictDoNothing();
        });
    }

    async transition(claimId: string, target: ClaimStatus, now = new Date()): Promise<Claim> {
        return this.#database.transaction(async (transaction) => {
            const locked = await transaction.execute<{ id: string }>(sql`
                SELECT ${claims.id} FROM ${claims}
                WHERE ${claims.id} = ${claimId}
                FOR UPDATE
            `);
            if (locked[0] === undefined) {
                throw new Error(`Claim ${claimId} does not exist`);
            }
            const record = await transaction.query.claims.findFirst({
                where: eq(claims.id, claimId)
            });
            if (record === undefined) {
                throw new Error(`Claim ${claimId} disappeared while locked`);
            }

            const dependencyRows = await transaction
                .select({ dependencyId: claimDependencies.dependencyId })
                .from(claimDependencies)
                .where(eq(claimDependencies.claimId, claimId));
            const evidenceRows = await transaction
                .select({
                    relationship: claimEvidence.relationship,
                    evidence
                })
                .from(claimEvidence)
                .innerJoin(evidence, eq(evidence.id, claimEvidence.evidenceId))
                .where(eq(claimEvidence.claimId, claimId));
            const assessedEvidence = evidenceRows.map(({ evidence: stored, relationship }) =>
                toAssessedEvidence(claimId, stored, relationship === "supports")
            );
            const supportingIds = evidenceRows
                .filter(({ relationship }) => relationship === "supports")
                .map(({ evidence: stored }) => stored.id);
            const contradictingIds = evidenceRows
                .filter(({ relationship }) => relationship === "contradicts")
                .map(({ evidence: stored }) => stored.id);
            const current = toClaim(
                record,
                dependencyRows.map(({ dependencyId }) => dependencyId),
                supportingIds,
                contradictingIds
            );
            const transitioned = transitionClaim(
                current,
                target,
                assessedEvidence,
                now.toISOString()
            );

            await transaction
                .update(claims)
                .set({ status: target, stale: transitioned.stale, updatedAt: now })
                .where(eq(claims.id, claimId));
            if (target === "refuted") {
                await transaction.execute(sql`
                    WITH RECURSIVE dependents(id) AS (
                        SELECT ${claimDependencies.claimId}
                        FROM ${claimDependencies}
                        WHERE ${claimDependencies.dependencyId} = ${claimId}
                        UNION
                        SELECT next_dependency.claim_id
                        FROM claim_dependencies next_dependency
                        INNER JOIN dependents ON next_dependency.dependency_id = dependents.id
                    )
                    UPDATE ${claims}
                    SET stale = TRUE, updated_at = ${sql.param(now, claims.updatedAt)}
                    WHERE ${claims.id} IN (SELECT id FROM dependents)
                `);
            }
            return transitioned;
        });
    }
}

function toClaim(
    record: typeof claims.$inferSelect,
    dependencyIds: readonly string[],
    supportingEvidenceIds: readonly string[],
    contradictingEvidenceIds: readonly string[]
): Claim {
    return {
        id: record.id,
        branch_id: record.branchId,
        statement: record.statement,
        status: record.status,
        assumption_ids: [...dependencyIds],
        supporting_evidence_ids: [...supportingEvidenceIds],
        contradicting_evidence_ids: [...contradictingEvidenceIds],
        stale: record.stale,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
    };
}

function toAssessedEvidence(
    claimId: string,
    stored: typeof evidence.$inferSelect,
    supports: boolean
): AssessedEvidence {
    const protocolEvidence: Evidence = {
        id: stored.id,
        kind: stored.kind,
        claim_id: claimId,
        summary: stored.summary,
        supports,
        independent: stored.independent,
        created_at: stored.createdAt.toISOString(),
        ...(stored.runId === null ? {} : { run_id: stored.runId }),
        ...(stored.artifactPath === null ? {} : { artifact_path: stored.artifactPath }),
        ...(stored.artifactHash === null ? {} : { artifact_hash: stored.artifactHash })
    };
    return {
        evidence: protocolEvidence,
        origin: stored.origin,
        sourceBranchId: stored.sourceBranchId,
        valid: stored.valid,
        complete: stored.complete,
        reproducible: stored.reproducible
    };
}
