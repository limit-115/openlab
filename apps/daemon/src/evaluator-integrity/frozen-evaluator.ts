import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { ExecutionResult } from "@lab/executor/types";
import {
    type ValidatedArtifact,
    validateFileArtifact
} from "#src/artifact-integrity/file-artifact";
import { normalizeEvaluatorSource } from "#src/evaluator-integrity/evaluator-source-normalization";
import {
    EvaluatorFileRequirement,
    TrivialEvaluatorSource
} from "#src/evaluator-integrity/frozen-evaluator.const";
import type {
    BoundEvaluatorInput,
    EvaluatorInputArtifact,
    EvaluatorTarget,
    FrozenEvaluator
} from "#src/evaluator-integrity/frozen-evaluator.types";
import {
    type EvaluatorPrecommit,
    type EvaluatorStructuredVerdict,
    EvaluatorStructuredVerdictSchema
} from "#src/research-contract/research-contract";
import { EVALUATOR_VERDICT } from "#src/research-contract/research-contract.const";

export async function freezeEvaluator(
    containmentRoot: string,
    candidate: EvaluatorPrecommit,
    target: EvaluatorTarget
): Promise<FrozenEvaluator> {
    if (candidate.target_kind !== target.kind || candidate.target_index !== target.index) {
        throw new Error("Evaluator precommit does not match its target");
    }
    const artifact = await validateFileArtifact(containmentRoot, candidate.evaluator_path);
    if (artifact.bytes < EvaluatorFileRequirement.MINIMUM_BYTES) {
        throw new Error("Evaluator executable is too small to implement a meaningful contract");
    }
    const metadata = await stat(artifact.path);
    if ((metadata.mode & EvaluatorFileRequirement.EXECUTABLE_MODE_MASK) === 0) {
        throw new Error("Evaluator must be a contained executable regular file");
    }
    const source = await readFile(artifact.path, "utf8");
    if (Object.values(TrivialEvaluatorSource).some((pattern) => pattern.test(source.trim()))) {
        throw new Error("Trivial always-success evaluator is forbidden");
    }

    return {
        targetKind: target.kind,
        targetIndex: target.index,
        targetClaimId: target.claim.id,
        targetStatementSha256: sha256(target.claim.statement),
        file: artifact.path,
        fileSha256: artifact.sha256,
        semanticIdentitySha256: evaluatorSemanticIdentity(
            source,
            candidate.args,
            candidate.success_contract
        ),
        args: [...candidate.args],
        successContract: candidate.success_contract
    };
}

export function evaluatorSemanticIdentity(
    source: string,
    args: readonly string[],
    successContract: string
): string {
    return sha256(
        JSON.stringify({
            source: normalizeEvaluatorSource(source),
            args,
            success_contract: successContract
        })
    );
}

export async function assertEvaluatorUnchanged(
    containmentRoot: string,
    evaluator: FrozenEvaluator
): Promise<void> {
    const artifact = await validateFileArtifact(containmentRoot, evaluator.file);
    if (artifact.sha256 !== evaluator.fileSha256) {
        throw new Error("Evaluator executable changed after precommit");
    }
}

export function bindEvaluatorInput(
    evaluator: FrozenEvaluator,
    artifacts: readonly ValidatedArtifact[]
): BoundEvaluatorInput {
    if (artifacts.length === 0) {
        throw new Error("Evaluator input requires at least one material artifact");
    }
    const canonicalArtifacts: EvaluatorInputArtifact[] = artifacts
        .map(({ path, bytes, sha256: artifactSha256 }) => ({
            path,
            bytes,
            sha256: artifactSha256
        }))
        .sort(
            (left, right) =>
                left.sha256.localeCompare(right.sha256) || left.path.localeCompare(right.path)
        );
    const payload = {
        schema_version: 1,
        target: {
            kind: evaluator.targetKind,
            index: evaluator.targetIndex,
            claim_id: evaluator.targetClaimId,
            statement_sha256: evaluator.targetStatementSha256
        },
        evaluator: {
            sha256: evaluator.fileSha256,
            args: evaluator.args,
            success_contract: evaluator.successContract
        },
        artifacts: canonicalArtifacts
    } as const;
    const bindingSha256 = sha256(JSON.stringify(payload));
    return {
        serialized: `${JSON.stringify({ ...payload, input_binding_sha256: bindingSha256 }, null, 4)}\n`,
        bindingSha256,
        artifactSha256s: canonicalArtifacts.map(({ sha256: artifactSha256 }) => artifactSha256)
    };
}

export async function validateEvaluatorVerdict(
    result: ExecutionResult,
    evaluator: FrozenEvaluator,
    input: BoundEvaluatorInput
): Promise<EvaluatorStructuredVerdict> {
    if (result.stdout.bytes === 0) {
        throw new Error("Evaluator produced no structured verdict");
    }
    const verdict = EvaluatorStructuredVerdictSchema.parse(
        JSON.parse(await readFile(result.stdout.path, "utf8"))
    );
    if (verdict.target_statement_sha256 !== evaluator.targetStatementSha256) {
        throw new Error("Evaluator verdict is not bound to the target statement");
    }
    if (verdict.input_binding_sha256 !== input.bindingSha256) {
        throw new Error("Evaluator verdict is not bound to the daemon input");
    }
    if (verdict.success_contract !== evaluator.successContract) {
        throw new Error("Evaluator verdict changed the frozen success contract");
    }
    if (!sameValues(verdict.artifact_sha256s, input.artifactSha256s)) {
        throw new Error("Evaluator verdict is not bound to every material artifact");
    }
    if (
        verdict.verdict === EVALUATOR_VERDICT.SUPPORTS &&
        verdict.checks.some(({ passed }) => !passed)
    ) {
        throw new Error("Supporting evaluator verdict contains a failed check");
    }
    if (
        verdict.verdict === EVALUATOR_VERDICT.CONTRADICTS &&
        verdict.checks.every(({ passed }) => passed)
    ) {
        throw new Error("Contradicting evaluator verdict contains no failed check");
    }
    return verdict;
}

function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
