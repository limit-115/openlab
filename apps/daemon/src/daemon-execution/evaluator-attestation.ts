import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runExperiment } from "@lab/executor/run";
import type { ExecutionResult } from "@lab/executor/types";
import { sanitizeHarnessEnvironment } from "@lab/harness/subscription-environment";
import { EventType, ExperimentStatus } from "@lab/protocol/constants";
import type { Claim } from "@lab/protocol/schemas";
import {
    type ValidatedArtifact,
    validateFileArtifact
} from "#src/artifact-integrity/file-artifact";
import { VERIFIER_EVALUATOR_TIMEOUT_MS } from "#src/daemon-execution/evaluator-attestation.const";
import {
    attemptEventType,
    experimentEventType,
    protocolExperimentStatus,
    renderCommand
} from "#src/daemon-execution/experiment-record";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import { assertArtifactsUnchanged } from "#src/daemon-execution/outcome-execution";
import {
    assertEvaluatorUnchanged,
    bindEvaluatorInput,
    validateEvaluatorVerdict
} from "#src/evaluator-integrity/frozen-evaluator";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import type { EvaluatorStructuredVerdict } from "#src/research-contract/research-contract";
import { EVALUATOR_VERDICT } from "#src/research-contract/research-contract.const";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";

export async function executeAttestedEvaluator(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    evaluatorWorkspace: ResearchWorkspace,
    executionWorkspace: ResearchWorkspace,
    claim: Claim,
    evaluator: string,
    frozenEvaluator: FrozenEvaluator,
    inputArtifacts: readonly ValidatedArtifact[],
    signal?: AbortSignal
): Promise<{
    result: ExecutionResult;
    experimentId: string;
    verdict: EvaluatorStructuredVerdict;
}> {
    await assertEvaluatorUnchanged(evaluatorWorkspace.cwd, frozenEvaluator);
    const evaluatorInput = bindEvaluatorInput(frozenEvaluator, inputArtifacts);
    const experimentId = `experiment-${randomUUID()}`;
    const artifactDirectory = path.join(
        executionWorkspace.cwd,
        ".lab-evaluator",
        `run-${randomUUID()}`
    );
    const startedAt = new Date().toISOString();
    await workspace.update((draft) => {
        draft.experiments.push({
            id: experimentId,
            task_id: ids.taskId,
            branch_id: ids.branchId,
            hypothesis: claim.statement,
            evaluator,
            command: renderCommand(frozenEvaluator.file, frozenEvaluator.args),
            cwd: executionWorkspace.cwd,
            status: ExperimentStatus.RUNNING,
            started_at: startedAt
        });
    });
    await workspace.appendEvent(EventType.EXPERIMENT_PLANNED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.EXPERIMENT_STARTED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.ATTEMPT_PLANNED, { attempt_id: experimentId });
    await workspace.appendEvent(EventType.ATTEMPT_STARTED, { attempt_id: experimentId });

    const result = await runExperiment(
        {
            file: frozenEvaluator.file,
            args: frozenEvaluator.args,
            cwd: executionWorkspace.cwd,
            artifactDirectory,
            timeoutMs: VERIFIER_EVALUATOR_TIMEOUT_MS,
            env: sanitizeHarnessEnvironment(),
            inheritEnvironment: false,
            input: evaluatorInput.serialized
        },
        signal
    );
    let status = protocolExperimentStatus(result.status);
    let verdict: EvaluatorStructuredVerdict | undefined;
    let validationError: unknown;
    if (status === ExperimentStatus.SUCCEEDED) {
        try {
            await assertArtifactsUnchanged(executionWorkspace, inputArtifacts);
            verdict = await validateEvaluatorVerdict(result, frozenEvaluator, evaluatorInput);
        } catch (error) {
            status = ExperimentStatus.FAILED;
            validationError = error;
        }
    }
    await workspace.update((draft) => {
        const experiment = requiredById(draft.experiments, experimentId);
        experiment.status = status;
        experiment.exit_code = result.exitCode;
        experiment.finished_at = result.finishedAt;
        experiment.output_path = result.manifest.path;
        experiment.output_hash = result.manifest.sha256;
    });
    const failurePayload =
        validationError === undefined
            ? {}
            : {
                  validation_error:
                      validationError instanceof Error
                          ? validationError.message
                          : String(validationError)
              };
    await workspace.appendEvent(experimentEventType(status), {
        experiment_id: experimentId,
        ...failurePayload
    });
    await workspace.appendEvent(attemptEventType(status), {
        attempt_id: experimentId,
        ...failurePayload
    });
    if (validationError !== undefined) {
        throw validationError;
    }
    if (verdict === undefined) {
        throw new Error(`Daemon-attested evaluator ended with ${result.status}`);
    }
    return { result, experimentId, verdict };
}

export async function assertEvaluatorRejectsNegativeControl(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    evaluatorWorkspace: ResearchWorkspace,
    executionWorkspace: ResearchWorkspace,
    claim: Claim,
    frozenEvaluator: FrozenEvaluator,
    inputArtifacts: readonly ValidatedArtifact[],
    signal?: AbortSignal
): Promise<void> {
    const controls = await createNegativeControlArtifacts(executionWorkspace, inputArtifacts);
    const evaluation = await executeAttestedEvaluator(
        workspace,
        ids,
        evaluatorWorkspace,
        executionWorkspace,
        claim,
        ExperimentEvaluator.NEGATIVE_CONTROL,
        frozenEvaluator,
        controls,
        signal
    );
    if (evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS) {
        throw new Error("Evaluator also supports daemon-owned negative-control artifacts");
    }
}

async function createNegativeControlArtifacts(
    workspace: ResearchWorkspace,
    inputArtifacts: readonly ValidatedArtifact[]
): Promise<ValidatedArtifact[]> {
    const controlDirectory = path.join(
        workspace.cwd,
        ".lab-evaluator-controls",
        `control-${randomUUID()}`
    );
    await mkdir(controlDirectory, { recursive: true });
    return Promise.all(
        inputArtifacts.map(async (artifact, index) => {
            const extension = path.extname(artifact.path);
            const controlPath = path.join(
                controlDirectory,
                `artifact-${String(index).padStart(3, "0")}${extension}`
            );
            await writeFile(controlPath, await negativeControlContent(artifact.path), {
                flag: "wx"
            });
            return validateFileArtifact(workspace.cwd, controlPath);
        })
    );
}

async function negativeControlContent(artifactPath: string): Promise<string> {
    const source = await readFile(artifactPath, "utf8");
    try {
        return `${JSON.stringify(emptyJsonValue(JSON.parse(source)), null, 4)}\n`;
    } catch {
        return "";
    }
}

function emptyJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return [];
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.keys(value).map((key) => [key, null]));
    }
    if (typeof value === "string") {
        return "";
    }
    if (typeof value === "boolean") {
        return false;
    }
    return null;
}
