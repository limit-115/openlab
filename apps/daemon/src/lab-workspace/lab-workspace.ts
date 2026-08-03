import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { transitionLabState } from "@lab/core/lab-lifecycle/lab-state-transitions";
import type { LifecycleContext } from "@lab/core/lab-lifecycle/lab-state-transitions.types";
import { WakeTrigger } from "@lab/core/lab-lifecycle/wake-trigger.const";
import { IncompatibleCheckpointError } from "@lab/db/runtime/incompatible-checkpoint";
import type {
    PersistedLabEvent,
    PersistedRuntime,
    RecoverableRuntime
} from "@lab/db/runtime/runtime-persistence.types";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { AnswerCapabilitySchema } from "@lab/protocol/capabilities/answer-capability.schema";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { EvidenceSchema } from "@lab/protocol/evidence/evidence.schema";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import {
    EventType,
    type EventType as LabEventType
} from "@lab/protocol/lab-events/event-type.const";
import { LabEventSchema } from "@lab/protocol/lab-events/lab-event.schema";
import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import {
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/lab-lifecycle/lab-state.const";
import { StatusSnapshotSchema } from "@lab/protocol/lab-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { TaskInputSchema } from "@lab/protocol/research-task/task-input.schema";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";
import { validateFileArtifact } from "#src/artifact-integrity/file-artifact";
import { type LabReportSubject, renderLabReport } from "#src/lab-workspace/lab-report";
import {
    type CurrentPointer,
    CurrentPointerStatus,
    readCurrentPointer,
    resolveRunDirectory,
    writeCurrentPointer
} from "#src/lab-workspace/lab-run-pointer";
import {
    WorkspaceMutationAction,
    WorkspaceRecoveryLimit
} from "#src/lab-workspace/lab-workspace.const";
import type {
    SnapshotUpdater,
    StatusListener,
    VerifiedResult,
    WorkspaceMutationResult,
    WorkspaceMutationUpdater,
    WorkspaceRuntimePersistence
} from "#src/lab-workspace/lab-workspace.types";
import { initialResearchIdentifiers } from "#src/research-cycle/research-identifiers";

export class LabWorkspace {
    readonly runDirectory: string;
    readonly labId: string;
    readonly recovered: boolean;

    private readonly mutex = new Mutex();
    private readonly listeners = new Set<StatusListener>();
    private readonly events: LabEvent[];
    private readonly evidence: Evidence[];
    private runtimePersistence: WorkspaceRuntimePersistence | undefined;
    private runtimeRevision: number | undefined;
    private snapshot: StatusSnapshot;

    private constructor(
        runDirectory: string,
        snapshot: StatusSnapshot,
        events: LabEvent[],
        evidence: Evidence[],
        recovered: boolean,
        runtimePersistence?: WorkspaceRuntimePersistence,
        runtimeRevision?: number
    ) {
        this.runDirectory = runDirectory;
        this.labId = snapshot.lab.id;
        this.snapshot = snapshot;
        this.events = events;
        this.evidence = evidence;
        this.recovered = recovered;
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = runtimeRevision;
    }

    static async openOrCreate(
        workspaceRoot: string,
        taskPath: string,
        runtimePersistence?: WorkspaceRuntimePersistence
    ): Promise<LabWorkspace> {
        const requestedTask = TaskInputSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
        const current = await readCurrentPointer(workspaceRoot);
        if (current.status === CurrentPointerStatus.VALID) {
            if (runtimePersistence === undefined) {
                const workspace = await LabWorkspace.load(
                    workspaceRoot,
                    current.pointer.run_directory
                );
                const existingTask = await workspace.getTask();
                const state = workspace.getSnapshot().lab.state;
                const recoverable = state === LabState.RUNNING || state === LabState.HIBERNATING;
                if (recoverable && LabWorkspace.tasksMatch(existingTask, requestedTask)) {
                    return workspace;
                }
            } else {
                const workspace = await LabWorkspace.loadFromRuntime(
                    workspaceRoot,
                    current.pointer,
                    requestedTask,
                    runtimePersistence
                );
                if (workspace !== undefined) {
                    return workspace;
                }
            }
        }
        if (runtimePersistence !== undefined) {
            const recoverable = await LabWorkspace.selectRecoverableRuntime(
                workspaceRoot,
                requestedTask,
                runtimePersistence
            );
            if (recoverable !== undefined) {
                return LabWorkspace.loadPersistedRuntime(
                    workspaceRoot,
                    recoverable,
                    runtimePersistence
                );
            }
        } else if (current.status === CurrentPointerStatus.INVALID) {
            throw current.error;
        }
        return LabWorkspace.initialize(workspaceRoot, taskPath, runtimePersistence);
    }

    static async initialize(
        workspaceRoot: string,
        taskPath: string,
        runtimePersistence?: WorkspaceRuntimePersistence
    ): Promise<LabWorkspace> {
        const task = TaskInputSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
        const labId = `lab-${randomUUID()}`;
        const initialIds = initialResearchIdentifiers(labId);
        const runDirectory = path.join(workspaceRoot, "runs", labId);
        const now = new Date().toISOString();
        const snapshot = StatusSnapshotSchema.parse({
            lab: {
                id: labId,
                state: LabState.RUNNING,
                goal: task.goal,
                started_at: now,
                updated_at: now,
                uptime_ms: 0
            },
            frontier: {
                known: task.context,
                open_questions:
                    task.success_criteria.length > 0
                        ? task.success_criteria
                        : ["Define a falsifiable success criterion"],
                blockers: [],
                next_experiments: ["Operationalize the research goal"],
                updated_at: now
            },
            branches: [
                {
                    id: initialIds.branchId,
                    title: "Goal operationalization",
                    approach: "Clarify claims, evaluators, and independent research directions",
                    status: BranchStatus.ACTIVE,
                    progress: "Queued"
                }
            ],
            agents: [
                {
                    id: initialIds.agentId,
                    branch_id: initialIds.branchId,
                    role: AgentRole.DIRECTOR,
                    status: AgentStatus.WORKING,
                    current_task_id: initialIds.taskId
                }
            ],
            tasks: [
                {
                    id: initialIds.taskId,
                    branch_id: initialIds.branchId,
                    objective: "Turn the goal into testable claims without prescribing a method",
                    context_refs: [],
                    status: InternalTaskStatus.QUEUED,
                    attempt: 1,
                    role: AgentRole.DIRECTOR
                }
            ]
        });

        await mkdir(runDirectory, { recursive: true });
        const workspace = new LabWorkspace(runDirectory, snapshot, [], [], false);
        await workspace.writeJson("task.json", task);
        await workspace.persistFilesystemSnapshot();
        if (runtimePersistence !== undefined) {
            await workspace.attachRuntimePersistence(runtimePersistence, task);
        }
        await writeCurrentPointer(workspaceRoot, {
            lab_id: labId,
            run_directory: runDirectory
        });

        return workspace;
    }

    static async load(workspaceRoot: string, runDirectory: string): Promise<LabWorkspace> {
        const resolvedRunDirectory = resolveRunDirectory(workspaceRoot, runDirectory);
        const [snapshotSource, eventsSource, storedEvidence] = await Promise.all([
            readFile(path.join(resolvedRunDirectory, "status.json"), "utf8"),
            readFile(path.join(resolvedRunDirectory, "events.json"), "utf8"),
            LabWorkspace.readOptionalEvidence(resolvedRunDirectory)
        ]);
        const snapshot = StatusSnapshotSchema.parse(JSON.parse(snapshotSource));
        const events = LabEventSchema.array().parse(JSON.parse(eventsSource));
        return new LabWorkspace(resolvedRunDirectory, snapshot, events, storedEvidence, true);
    }

    private static async loadFromRuntime(
        workspaceRoot: string,
        current: CurrentPointer,
        requestedTask: TaskInput,
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<LabWorkspace | undefined> {
        resolveRunDirectory(workspaceRoot, current.run_directory);
        const persisted = await LabWorkspace.loadResumableRuntime(
            runtimePersistence,
            current.lab_id
        );
        if (persisted === undefined) {
            return undefined;
        }
        LabWorkspace.validatePersistedRuntime(workspaceRoot, persisted, current.lab_id);
        if (!LabWorkspace.tasksMatch(persisted.task, requestedTask)) {
            return undefined;
        }
        const state = persisted.checkpoint.snapshot.lab.state;
        if (state !== LabState.RUNNING && state !== LabState.HIBERNATING) {
            return undefined;
        }
        return LabWorkspace.loadPersistedRuntime(workspaceRoot, persisted, runtimePersistence);
    }

    /**
     * A checkpoint written before a protocol change describes a run this build cannot act on, so it
     * joins a mismatched task and a terminal state as a reason to start fresh rather than resume.
     */
    private static async loadResumableRuntime(
        runtimePersistence: WorkspaceRuntimePersistence,
        labId: string
    ): Promise<PersistedRuntime | undefined> {
        try {
            return await runtimePersistence.load(labId);
        } catch (error) {
            if (error instanceof IncompatibleCheckpointError) {
                return undefined;
            }
            throw error;
        }
    }

    private static async loadPersistedRuntime(
        workspaceRoot: string,
        persisted: PersistedRuntime,
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<LabWorkspace> {
        LabWorkspace.validatePersistedRuntime(workspaceRoot, persisted);
        const runDirectory = resolveRunDirectory(workspaceRoot, persisted.workspacePath);
        const labId = persisted.checkpoint.snapshot.lab.id;
        const events = await LabWorkspace.readAllRuntimeEvents(runtimePersistence, labId);
        await mkdir(runDirectory, { recursive: true });
        const workspace = new LabWorkspace(
            runDirectory,
            persisted.checkpoint.snapshot,
            events,
            persisted.checkpoint.evidence,
            true,
            runtimePersistence,
            persisted.checkpoint.revision
        );
        await workspace.writeJson("task.json", persisted.task);
        await workspace.persistFilesystemSnapshot();
        await writeCurrentPointer(workspaceRoot, {
            lab_id: labId,
            run_directory: runDirectory
        });
        return workspace;
    }

    private static async selectRecoverableRuntime(
        workspaceRoot: string,
        requestedTask: TaskInput,
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<RecoverableRuntime | undefined> {
        const recoverable = await runtimePersistence.listRecoverable(
            WorkspaceRecoveryLimit.MAX_RECORDS
        );
        const identifierMismatch = recoverable.find(
            ({ task }) =>
                requestedTask.id !== undefined &&
                task.id === requestedTask.id &&
                !LabWorkspace.tasksMatch(task, requestedTask)
        );
        if (identifierMismatch !== undefined) {
            throw new Error(
                `Recoverable task ${requestedTask.id} does not match the requested task input`
            );
        }

        const matching = recoverable
            .filter(({ task }) => LabWorkspace.tasksMatch(task, requestedTask))
            .map((candidate) => {
                LabWorkspace.validatePersistedRuntime(workspaceRoot, candidate);
                return candidate;
            })
            .sort((left, right) => Date.parse(right.persistedAt) - Date.parse(left.persistedAt));
        const latest = matching[0];
        const next = matching[1];
        if (latest !== undefined && next?.persistedAt === latest.persistedAt) {
            throw new Error("Multiple recoverable runtimes share the latest checkpoint timestamp");
        }
        return latest;
    }

    private static validatePersistedRuntime(
        workspaceRoot: string,
        persisted: PersistedRuntime,
        expectedLabId: string = persisted.checkpoint.snapshot.lab.id
    ): void {
        const snapshot = StatusSnapshotSchema.parse(persisted.checkpoint.snapshot);
        const task = TaskInputSchema.parse(persisted.task);
        if (snapshot.lab.id !== expectedLabId) {
            throw new Error(`Runtime checkpoint does not match lab ${expectedLabId}`);
        }
        if (snapshot.lab.goal !== task.goal) {
            throw new Error("Persisted runtime checkpoint does not match its task input");
        }
        if (Number.isNaN(Date.parse(persisted.persistedAt))) {
            throw new Error("Persisted runtime checkpoint timestamp is invalid");
        }
        resolveRunDirectory(workspaceRoot, persisted.workspacePath);
    }

    getTask(): Promise<TaskInput> {
        return readFile(path.join(this.runDirectory, "task.json"), "utf8").then((value) =>
            TaskInputSchema.parse(JSON.parse(value))
        );
    }

    getSnapshot(): StatusSnapshot {
        return structuredClone(this.snapshot);
    }

    getEvents(): LabEvent[] {
        return structuredClone(this.events);
    }

    getEvidence(): Evidence[] {
        return structuredClone(this.evidence);
    }

    inspect(id: string): unknown | undefined {
        const snapshot = this.snapshot;
        return (
            snapshot.claims.find((claim) => claim.id === id) ??
            this.evidence.find((evidence) => evidence.id === id) ??
            snapshot.experiments.find((experiment) => experiment.id === id) ??
            snapshot.tasks.find((task) => task.id === id) ??
            snapshot.branches.find((branch) => branch.id === id)
        );
    }

    subscribe(listener: StatusListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    async update(updater: SnapshotUpdater): Promise<StatusSnapshot> {
        return this.mutex.runExclusive(async () => {
            const draft = structuredClone(this.snapshot);
            updater(draft);
            this.touch(draft);
            const parsed = StatusSnapshotSchema.parse(draft);
            this.snapshot = await this.commitRuntime(parsed);
            await this.persistFilesystemSnapshot();
            return this.getSnapshot();
        });
    }

    async mutateWithEvent(
        type: LabEventType,
        payload: Readonly<Record<string, unknown>>,
        updater: WorkspaceMutationUpdater = () => WorkspaceMutationAction.COMMIT
    ): Promise<WorkspaceMutationResult | undefined> {
        const mutation = await this.mutex.runExclusive(async () => {
            const event = LabEventSchema.parse({
                id: `event-${randomUUID()}`,
                lab_id: this.labId,
                type,
                occurred_at: new Date().toISOString(),
                payload
            });
            const draft = structuredClone(this.snapshot);
            const action = updater(draft, event) ?? WorkspaceMutationAction.COMMIT;
            if (action === WorkspaceMutationAction.SKIP) {
                return undefined;
            }
            draft.recent_events = [...this.events, event].slice(-200);
            this.touch(draft);
            const parsed = StatusSnapshotSchema.parse(draft);
            const committedSnapshot = await this.commitRuntime(parsed, event);

            this.snapshot = committedSnapshot;
            this.events.push(event);
            await this.persistFilesystemSnapshot();
            return {
                snapshot: this.getSnapshot(),
                event: structuredClone(event)
            };
        });
        if (mutation === undefined) {
            return undefined;
        }
        for (const listener of this.listeners) {
            listener(mutation.event, mutation.snapshot);
        }
        return mutation;
    }

    async transition(
        state: LabStateValue,
        reason?: string,
        context: LifecycleContext = {}
    ): Promise<StatusSnapshot> {
        const mutation = await this.mutateWithEvent(
            EventType.LAB_STATE_CHANGED,
            {
                state,
                ...(reason === undefined ? {} : { reason }),
                ...(context.wakeTrigger === undefined ? {} : { wake_trigger: context.wakeTrigger })
            },
            (draft) => {
                transitionLabState(draft.lab.state, state, context);
                draft.lab.state = state;
                if (reason === undefined) {
                    delete draft.lab.reason;
                } else {
                    draft.lab.reason = reason;
                }
            }
        );
        if (mutation === undefined) {
            throw new Error("Lab state transition was unexpectedly skipped");
        }
        return mutation.snapshot;
    }

    async hibernateForPlateau(reason: string): Promise<StatusSnapshot> {
        const reportPath = path.join(this.runDirectory, "report.md");
        await writeFileAtomic(
            reportPath,
            renderLabReport(this.reportSubject(), "Plateau report", reason, {
                limitations: this.snapshot.frontier.blockers,
                nextExperiments: this.snapshot.frontier.next_experiments
            })
        );
        const mutation = await this.mutateWithEvent(
            EventType.LAB_STATE_CHANGED,
            { state: LabState.HIBERNATING, reason },
            (draft) => {
                transitionLabState(draft.lab.state, LabState.HIBERNATING, {
                    plateauConfirmed: true
                });
                draft.lab.state = LabState.HIBERNATING;
                draft.lab.reason = reason;
                draft.result = {
                    summary: reason,
                    report_path: reportPath,
                    limitations: [...draft.frontier.blockers]
                };
            }
        );
        if (mutation === undefined) {
            throw new Error("Lab hibernation was unexpectedly skipped");
        }
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.LAB_HIBERNATED, { reason });
        return mutation.snapshot;
    }

    async complete(result: VerifiedResult): Promise<StatusSnapshot> {
        const supportingEvidence = await this.validateCompletionEvidence(result);
        const reportPath = path.join(this.runDirectory, "report.md");
        const resultPath = path.join(this.runDirectory, "result.json");
        const resultFile = {
            lab_id: this.labId,
            status: LabState.COMPLETED,
            result: result.summary,
            supporting_evidence_ids: result.supportingEvidenceIds,
            independent_verifier_verdict_id: result.independentVerifierVerdictId,
            limitations: result.limitations,
            known_counterexamples: result.knownCounterexamples,
            completed_at: new Date().toISOString()
        };
        const context: LifecycleContext = {
            completion: {
                resultStatement: result.summary,
                supportingEvidenceIds: result.supportingEvidenceIds,
                independentVerifierVerdictId: result.independentVerifierVerdictId,
                limitations: result.limitations,
                knownCounterexamples: result.knownCounterexamples,
                reportPath,
                resultPath
            }
        };
        transitionLabState(this.snapshot.lab.state, LabState.COMPLETED, context);
        await Promise.all([
            writeFileAtomic(
                reportPath,
                renderLabReport(this.reportSubject(), "Verified result", result.summary, {
                    supportingEvidenceIds: result.supportingEvidenceIds,
                    limitations: result.limitations,
                    knownCounterexamples: result.knownCounterexamples,
                    nextExperiments: this.snapshot.frontier.next_experiments
                })
            ),
            this.writeJson("result.json", resultFile)
        ]);
        const mutation = await this.mutateWithEvent(
            EventType.LAB_STATE_CHANGED,
            {
                state: LabState.COMPLETED,
                verifier_verdict_id: result.independentVerifierVerdictId
            },
            (draft) => {
                transitionLabState(draft.lab.state, LabState.COMPLETED, context);
                draft.lab.state = LabState.COMPLETED;
                delete draft.lab.reason;
                draft.result = {
                    summary: result.summary,
                    report_path: reportPath,
                    result_path: resultPath,
                    limitations: [...result.limitations]
                };
            }
        );
        if (mutation === undefined) {
            throw new Error("Lab completion was unexpectedly skipped");
        }
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.RESULT_GENERATED, {
            result_path: resultPath,
            supporting_evidence_ids: supportingEvidence.map(({ id }) => id)
        });
        await this.appendEvent(EventType.LAB_COMPLETED, {
            verifier_verdict_id: result.independentVerifierVerdictId
        });
        return mutation.snapshot;
    }

    async recordEvidence(candidate: Evidence): Promise<Evidence> {
        const evidence = EvidenceSchema.parse(candidate);
        await this.validateStoredEvidenceArtifact(evidence);

        const recorded = await this.mutex.runExclusive(async () => {
            const existing = this.evidence.find(({ id }) => id === evidence.id);
            if (existing !== undefined) {
                if (JSON.stringify(existing) !== JSON.stringify(evidence)) {
                    throw new Error(
                        `Evidence id already exists with different content: ${evidence.id}`
                    );
                }
                return { evidence: structuredClone(existing), shouldWake: false };
            }
            const nextEvidence = [...this.evidence, evidence];
            const draft = structuredClone(this.snapshot);
            const shouldWake = draft.lab.state === LabState.HIBERNATING;
            this.touch(draft);
            const parsed = StatusSnapshotSchema.parse(draft);
            this.snapshot = await this.commitRuntime(parsed, undefined, nextEvidence);
            this.evidence.splice(0, this.evidence.length, ...nextEvidence);
            await this.persistFilesystemSnapshot();
            return { evidence: structuredClone(evidence), shouldWake };
        });
        if (recorded.shouldWake) {
            await this.wakeIfHibernating("Durable evidence recorded", WakeTrigger.EVIDENCE);
        }
        return recorded.evidence;
    }

    async appendEvent(type: LabEventType, payload: Record<string, unknown>): Promise<LabEvent> {
        const mutation = await this.mutateWithEvent(type, payload);
        if (mutation === undefined) {
            throw new Error("Event append was unexpectedly skipped");
        }
        return mutation.event;
    }

    /**
     * Settles a request with whatever the operator typed. A refusal settles it exactly as a handed
     * over credential does: the agent is owed an answer, not a resource, and prose it can read beats
     * a request that stays open because the honest reply had nowhere to go.
     */
    async answerCapability(id: string, answer: string): Promise<boolean> {
        const normalizedAnswer = AnswerCapabilitySchema.parse({ answer }).answer;
        let accepted = false;
        let shouldWake = false;
        await this.mutateWithEvent(
            EventType.CAPABILITY_ANSWERED,
            {
                request_id: id,
                answer: normalizedAnswer
            },
            (draft, event) => {
                const request = draft.capability_requests.find((candidate) => candidate.id === id);
                if (request === undefined) {
                    return WorkspaceMutationAction.SKIP;
                }
                if (request.status === CapabilityStatus.ANSWERED) {
                    accepted = request.answer === normalizedAnswer;
                    return WorkspaceMutationAction.SKIP;
                }

                accepted = true;
                shouldWake = draft.lab.state === LabState.HIBERNATING;
                request.status = CapabilityStatus.ANSWERED;
                request.answer = normalizedAnswer;
                request.answered_at = event.occurred_at;
                draft.frontier.blockers = draft.frontier.blockers.filter(
                    (blocker) => blocker !== request.need
                );
                return WorkspaceMutationAction.COMMIT;
            }
        );
        if (shouldWake) {
            await this.wakeIfHibernating(`Capability ${id} answered`, WakeTrigger.CAPABILITY);
        }
        return accepted;
    }

    private async wakeIfHibernating(reason: string, wakeTrigger: WakeTrigger): Promise<void> {
        await this.mutateWithEvent(
            EventType.LAB_STATE_CHANGED,
            { state: LabState.RUNNING, reason, wake_trigger: wakeTrigger },
            (draft) => {
                if (draft.lab.state !== LabState.HIBERNATING) {
                    return WorkspaceMutationAction.SKIP;
                }
                transitionLabState(draft.lab.state, LabState.RUNNING, { wakeTrigger });
                draft.lab.state = LabState.RUNNING;
                draft.lab.reason = reason;
                return WorkspaceMutationAction.COMMIT;
            }
        );
    }

    /**
     * Only a request the agent declared it cannot work around becomes a frontier blocker. An ask
     * raised alongside work that continues is visible to the operator without standing in as a
     * reason the lab is stuck.
     */
    async requestCapability(input: {
        need: string;
        reason: string;
        provisioningHint: string;
        selfProvisioningAttempt?: string;
        blocking: boolean;
    }): Promise<CapabilityRequest> {
        const request: CapabilityRequest = {
            id: `capability-${randomUUID()}`,
            type: CapabilityRequestType.CAPABILITY_REQUEST,
            need: input.need,
            reason: input.reason,
            provisioning_hint: input.provisioningHint,
            ...(input.selfProvisioningAttempt === undefined
                ? {}
                : { self_provisioning_attempt: input.selfProvisioningAttempt }),
            blocking: input.blocking,
            status: CapabilityStatus.OPEN,
            created_at: new Date().toISOString()
        };
        let selected: CapabilityRequest = request;
        await this.mutateWithEvent(
            EventType.CAPABILITY_REQUESTED,
            {
                request_id: request.id,
                need: request.need,
                reason: request.reason
            },
            (draft) => {
                const existing = draft.capability_requests.find(
                    (candidate) =>
                        candidate.status === CapabilityStatus.OPEN && candidate.need === input.need
                );
                if (existing !== undefined) {
                    selected = existing;
                    return WorkspaceMutationAction.SKIP;
                }
                draft.capability_requests.push(request);
                if (request.blocking && !draft.frontier.blockers.includes(request.need)) {
                    draft.frontier.blockers.push(request.need);
                }
                return WorkspaceMutationAction.COMMIT;
            }
        );
        if (selected.id !== request.id) {
            return structuredClone(selected);
        }
        return structuredClone(request);
    }

    private async attachRuntimePersistence(
        runtimePersistence: WorkspaceRuntimePersistence,
        task: TaskInput
    ): Promise<void> {
        const persisted = await runtimePersistence.load(this.labId);
        if (persisted !== undefined) {
            if (!LabWorkspace.tasksMatch(persisted.task, task)) {
                throw new Error("Persisted runtime task does not match task.json");
            }
            if (path.resolve(persisted.workspacePath) !== path.resolve(this.runDirectory)) {
                throw new Error("Persisted runtime workspace does not match the run directory");
            }
            const checkpoint = persisted.checkpoint;
            this.runtimePersistence = runtimePersistence;
            this.runtimeRevision = checkpoint.revision;
            this.snapshot = checkpoint.snapshot;
            this.evidence.splice(0, this.evidence.length, ...checkpoint.evidence);
            const events = await LabWorkspace.readAllRuntimeEvents(runtimePersistence, this.labId);
            this.events.splice(0, this.events.length, ...events);
            await this.persistFilesystemSnapshot();
            return;
        }

        const [firstEvent, ...remainingEvents] = this.events;
        let initialized = await runtimePersistence.initialize({
            task,
            workspacePath: this.runDirectory,
            snapshot: this.snapshot,
            evidence: this.evidence,
            ...(firstEvent === undefined ? {} : { event: firstEvent })
        });
        for (const event of remainingEvents) {
            initialized = await runtimePersistence.commit({
                snapshot: this.snapshot,
                evidence: this.evidence,
                expectedRevision: initialized.revision,
                event
            });
        }
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = initialized.revision;
        this.snapshot = initialized.snapshot;
        this.evidence.splice(0, this.evidence.length, ...initialized.evidence);
        await this.persistFilesystemSnapshot();
    }

    private async commitRuntime(
        snapshot: StatusSnapshot,
        event?: LabEvent,
        evidenceRecords: readonly Evidence[] = this.evidence
    ): Promise<StatusSnapshot> {
        if (this.runtimePersistence === undefined) {
            return snapshot;
        }
        if (this.runtimeRevision === undefined) {
            throw new Error("Runtime persistence is attached without a revision");
        }
        const committed = await this.runtimePersistence.commit({
            snapshot,
            evidence: evidenceRecords,
            expectedRevision: this.runtimeRevision,
            ...(event === undefined ? {} : { event })
        });
        this.runtimeRevision = committed.revision;
        return committed.snapshot;
    }

    private touch(snapshot: StatusSnapshot): void {
        const now = new Date();
        snapshot.lab.updated_at = now.toISOString();
        snapshot.lab.uptime_ms = Math.max(
            0,
            now.getTime() - new Date(snapshot.lab.started_at).getTime()
        );
        snapshot.frontier.updated_at = snapshot.lab.updated_at;
    }

    private async persistFilesystemSnapshot(): Promise<void> {
        await Promise.all([
            this.writeJson("status.json", this.snapshot),
            this.writeJson("events.json", this.events),
            this.writeJson("claims.json", this.snapshot.claims),
            this.writeJson("experiments.json", this.snapshot.experiments),
            this.writeJson("evidence.json", this.evidence)
        ]);
    }

    private async validateCompletionEvidence(result: VerifiedResult): Promise<Evidence[]> {
        if (result.supportingEvidenceIds.length === 0) {
            throw new Error("Completion requires supporting evidence");
        }
        const requestedIds = [...new Set(result.supportingEvidenceIds)];
        if (requestedIds.length !== result.supportingEvidenceIds.length) {
            throw new Error("Completion evidence ids must be unique");
        }
        const selected = requestedIds.map((id) => {
            const evidence = this.evidence.find((candidate) => candidate.id === id);
            if (evidence === undefined) {
                throw new Error(`Completion references unknown evidence: ${id}`);
            }
            return evidence;
        });
        const verifier = selected.find(({ id }) => id === result.independentVerifierVerdictId);
        if (
            verifier === undefined ||
            verifier.kind !== EvidenceKind.VERIFIER_RESULT ||
            !verifier.independent ||
            !verifier.supports
        ) {
            throw new Error("Completion requires material evidence from an independent verifier");
        }
        if (
            !selected.some(
                ({ kind, supports }) =>
                    kind !== EvidenceKind.VERIFIER_RESULT &&
                    kind !== EvidenceKind.SOURCE &&
                    supports
            )
        ) {
            throw new Error("Completion requires supporting material evidence before verification");
        }
        if (
            selected.some(({ supports, claim_id }) => !supports || claim_id !== verifier.claim_id)
        ) {
            throw new Error("Completion evidence must support the independently verified claim");
        }

        const claim = this.snapshot.claims.find(({ id }) => id === verifier.claim_id);
        if (claim === undefined || claim.status !== ClaimStatus.REPRODUCED) {
            throw new Error("Completion requires a reproduced claim");
        }
        if (selected.some(({ id }) => !claim.supporting_evidence_ids.includes(id))) {
            throw new Error("Completion evidence is not linked to the reproduced claim");
        }

        await Promise.all(
            selected.map((evidence) => this.validateStoredEvidenceArtifact(evidence))
        );
        return selected;
    }

    private async validateStoredEvidenceArtifact(evidence: Evidence) {
        if (evidence.artifact_path === undefined || evidence.artifact_hash === undefined) {
            throw new Error(`Evidence must reference a hashed material artifact: ${evidence.id}`);
        }
        const artifact = await validateFileArtifact(this.runDirectory, evidence.artifact_path);
        if (artifact.sha256 !== evidence.artifact_hash) {
            throw new Error(`Evidence artifact changed after recording: ${evidence.id}`);
        }
        return artifact;
    }

    private static async readOptionalEvidence(runDirectory: string): Promise<Evidence[]> {
        try {
            const source = await readFile(path.join(runDirectory, "evidence.json"), "utf8");
            return EvidenceSchema.array().parse(JSON.parse(source));
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                return [];
            }
            throw error;
        }
    }

    private static async readAllRuntimeEvents(
        runtimePersistence: WorkspaceRuntimePersistence,
        labId: string
    ): Promise<LabEvent[]> {
        const events: LabEvent[] = [];
        let cursor = 0;
        for (;;) {
            const page = await runtimePersistence.eventsAfter(labId, cursor, 1_000);
            if (page.length === 0) {
                return events;
            }
            events.push(...page.map(LabWorkspace.toLabEvent));
            const last = page.at(-1);
            if (last === undefined) {
                return events;
            }
            cursor = last.sequence;
            if (page.length < 1_000) {
                return events;
            }
        }
    }

    private static toLabEvent(event: PersistedLabEvent): LabEvent {
        return {
            id: event.id,
            lab_id: event.lab_id,
            type: event.type,
            occurred_at: event.occurred_at,
            payload: event.payload
        };
    }

    private writeJson(fileName: string, value: unknown): Promise<void> {
        return writeFileAtomic(
            path.join(this.runDirectory, fileName),
            `${JSON.stringify(value, null, 4)}\n`
        );
    }

    private reportSubject(): LabReportSubject {
        return {
            snapshot: this.snapshot,
            evidence: this.evidence,
            runDirectory: this.runDirectory
        };
    }

    private static tasksMatch(left: TaskInput, right: TaskInput): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}
