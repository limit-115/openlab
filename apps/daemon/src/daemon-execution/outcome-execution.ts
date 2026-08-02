import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DECLARED_OUTPUT_STATUS } from "@lab/executor/constants";
import { runExperiment } from "@lab/executor/run";
import type { ArtifactDescriptor, ExecutionResult } from "@lab/executor/types";
import { evaluateModelApiCommand } from "@lab/harness/model-api-policy";
import { ModelApiPolicyDecision } from "@lab/harness/model-api-policy.const";
import { sanitizeHarnessEnvironment } from "@lab/harness/subscription-environment";
import { EventType, ExperimentStatus, ExternalEffect } from "@lab/protocol/constants";
import {
    type ValidatedArtifact,
    validateFileArtifact
} from "#src/artifact-integrity/file-artifact";
import {
    attemptEventType,
    experimentEventType,
    protocolExperimentStatus,
    renderCommand
} from "#src/daemon-execution/experiment-record";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import {
    CleanWorkspaceEntry,
    OutcomeAuthenticationEnvironment
} from "#src/daemon-execution/outcome-execution.const";
import type { OutcomeExecution } from "#src/daemon-execution/outcome-execution.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import type { ResearchResult } from "#src/research-contract/research-contract";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";

export class OutcomeExecutionAttemptError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "OutcomeExecutionAttemptError";
    }
}

export async function executeResearchOutcome(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    outcomeWorkspace: ResearchWorkspace,
    plan: NonNullable<ResearchResult["execution_plan"]>,
    signal?: AbortSignal
): Promise<OutcomeExecution> {
    const experimentId = `experiment-${randomUUID()}`;
    assertOutcomeCommandAllowed(plan);
    const executionFingerprint = outcomeExecutionFingerprint(plan);
    const artifactDirectory = path.join(
        outcomeWorkspace.cwd,
        ".lab-outcome-executions",
        `run-${randomUUID()}`
    );
    const startedAt = new Date().toISOString();
    await workspace.mutateWithEvent(
        EventType.EXPERIMENT_PLANNED,
        {
            experiment_id: experimentId,
            external_effect: plan.external_effect,
            reconciliation_key: plan.reconciliation_key ?? null,
            execution_fingerprint: executionFingerprint
        },
        (draft) => {
            if (plan.external_effect === ExternalEffect.IRREVERSIBLE) {
                const priorAttempt = draft.experiments.find(
                    (experiment) =>
                        experiment.external_effect === ExternalEffect.IRREVERSIBLE &&
                        ((plan.reconciliation_key !== undefined &&
                            experiment.reconciliation_key === plan.reconciliation_key) ||
                            experiment.execution_fingerprint === executionFingerprint)
                );
                if (priorAttempt !== undefined) {
                    throw new OutcomeExecutionAttemptError(
                        `Irreversible outcome execution is blocked by prior attempt ${priorAttempt.id} (${priorAttempt.status}); reconciliation is required`
                    );
                }
            }
            draft.experiments.push({
                id: experimentId,
                task_id: ids.taskId,
                branch_id: ids.branchId,
                hypothesis: "Execute the researcher-declared outcome computation",
                evaluator: ExperimentEvaluator.OUTCOME_EXECUTOR,
                command: renderCommand(plan.file, plan.args),
                cwd: outcomeWorkspace.cwd,
                status: ExperimentStatus.RUNNING,
                started_at: startedAt,
                external_effect: plan.external_effect,
                execution_fingerprint: executionFingerprint,
                ...(plan.reconciliation_key === undefined
                    ? {}
                    : { reconciliation_key: plan.reconciliation_key })
            });
        }
    );
    await workspace.appendEvent(EventType.EXPERIMENT_STARTED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.ATTEMPT_PLANNED, {
        attempt_id: experimentId,
        external_effect: plan.external_effect,
        reconciliation_key: plan.reconciliation_key ?? null
    });
    await workspace.appendEvent(EventType.ATTEMPT_STARTED, { attempt_id: experimentId });

    let result: ExecutionResult;
    try {
        result = await runExperiment(
            {
                file: plan.file,
                args: plan.args,
                cwd: outcomeWorkspace.cwd,
                artifactDirectory,
                timeoutMs: plan.timeout_ms,
                env: await outcomeExecutionEnvironment(outcomeWorkspace.cwd),
                inheritEnvironment: false,
                input: `${JSON.stringify({ execution_plan: plan }, null, 4)}\n`,
                declaredOutputPaths: plan.declared_output_paths
            },
            signal
        );
    } catch (error) {
        const finishedAt = new Date().toISOString();
        await workspace.update((draft) => {
            const experiment = requiredById(draft.experiments, experimentId);
            experiment.status = ExperimentStatus.FAILED;
            experiment.finished_at = finishedAt;
        });
        await workspace.appendEvent(EventType.EXPERIMENT_FAILED, {
            experiment_id: experimentId
        });
        await workspace.appendEvent(EventType.ATTEMPT_FAILED, { attempt_id: experimentId });
        throw new OutcomeExecutionAttemptError(
            `Daemon-owned outcome execution could not start: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
        );
    }

    let status = protocolExperimentStatus(result.status);
    let artifacts: readonly ValidatedArtifact[] = [];
    let validationError: unknown;
    if (status === ExperimentStatus.SUCCEEDED) {
        try {
            const unavailable = result.declaredOutputs.filter(
                ({ status: outputStatus }) => outputStatus !== DECLARED_OUTPUT_STATUS.RECORDED
            );
            if (unavailable.length > 0) {
                throw new Error(
                    `Outcome command did not produce every declared output: ${unavailable
                        .map(({ requestedPath }) => requestedPath)
                        .join(", ")}`
                );
            }
            const recorded = result.declaredOutputs.flatMap((output) =>
                output.status === DECLARED_OUTPUT_STATUS.RECORDED ? [output.artifact] : []
            );
            artifacts = await snapshotOutcomeArtifacts(outcomeWorkspace, recorded);
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
    await workspace.appendEvent(experimentEventType(status), { experiment_id: experimentId });
    await workspace.appendEvent(attemptEventType(status), { attempt_id: experimentId });

    if (status !== ExperimentStatus.SUCCEEDED || validationError !== undefined) {
        const reason =
            validationError instanceof Error
                ? validationError.message
                : (result.error ?? `execution ended with ${result.status}`);
        throw new OutcomeExecutionAttemptError(
            `Daemon-owned outcome execution failed: ${reason}`,
            validationError === undefined ? undefined : { cause: validationError }
        );
    }
    return { experimentId, result, artifacts };
}

function assertOutcomeCommandAllowed(plan: NonNullable<ResearchResult["execution_plan"]>): void {
    const result = evaluateModelApiCommand(plan.file, plan.args);
    if (result.decision === ModelApiPolicyDecision.DENY) {
        throw new OutcomeExecutionAttemptError(
            `Daemon-owned outcome command violates the subscription-only policy: ${result.reason ?? "denied"}`
        );
    }
}

function outcomeExecutionFingerprint(plan: NonNullable<ResearchResult["execution_plan"]>): string {
    return createHash("sha256")
        .update(
            JSON.stringify({
                file: plan.file,
                args: plan.args,
                declared_output_paths: [...plan.declared_output_paths].sort()
            })
        )
        .digest("hex");
}

async function outcomeExecutionEnvironment(cwd: string): Promise<Record<string, string>> {
    const environment = sanitizeHarnessEnvironment();
    const emptyAuthenticationRoot = path.join(cwd, ".lab-empty-model-auth");
    await mkdir(emptyAuthenticationRoot, { recursive: true, mode: 0o700 });
    environment[OutcomeAuthenticationEnvironment.HOME] = emptyAuthenticationRoot;
    environment[OutcomeAuthenticationEnvironment.CODEX_HOME] = emptyAuthenticationRoot;
    environment[OutcomeAuthenticationEnvironment.CLAUDE_CONFIG_DIR] = emptyAuthenticationRoot;
    return environment;
}

async function snapshotOutcomeArtifacts(
    workspace: ResearchWorkspace,
    artifacts: readonly ArtifactDescriptor[]
): Promise<ValidatedArtifact[]> {
    const snapshotDirectory = path.join(
        workspace.cwd,
        ".lab-outcome-snapshots",
        `snapshot-${randomUUID()}`
    );
    await mkdir(snapshotDirectory, { recursive: true });
    return Promise.all(
        artifacts.map(async (artifact, index) => {
            const snapshotPath = path.join(
                snapshotDirectory,
                `artifact-${String(index).padStart(3, "0")}${path.extname(artifact.path)}`
            );
            await writeFile(snapshotPath, await readFile(artifact.path), {
                flag: "wx",
                mode: 0o400
            });
            const snapshot = await validateFileArtifact(workspace.cwd, snapshotPath);
            if (snapshot.sha256 !== artifact.sha256 || snapshot.bytes !== artifact.bytes) {
                throw new Error(
                    `Outcome artifact changed while being snapshotted: ${artifact.path}`
                );
            }
            return snapshot;
        })
    );
}

export async function assertArtifactsUnchanged(
    workspace: ResearchWorkspace,
    artifacts: readonly ValidatedArtifact[]
): Promise<void> {
    for (const artifact of artifacts) {
        const rehashed = await validateFileArtifact(workspace.cwd, artifact.path);
        if (rehashed.sha256 !== artifact.sha256 || rehashed.bytes !== artifact.bytes) {
            throw new Error(`Outcome snapshot changed across evaluator boundary: ${artifact.path}`);
        }
    }
}

export async function assertCleanOutcomeWorkspace(workspace: ResearchWorkspace): Promise<void> {
    const unexpectedEntries = (await readdir(workspace.cwd)).filter(
        (entry) => entry !== CleanWorkspaceEntry.GIT
    );
    if (unexpectedEntries.length > 0) {
        throw new Error(
            `Research outcome workspace is not clean: ${unexpectedEntries.sort().join(", ")}`
        );
    }
}
