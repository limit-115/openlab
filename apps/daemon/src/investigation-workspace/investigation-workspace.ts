import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { transitionInvestigationState } from "@lab/core/investigation-lifecycle/investigation-state-transitions";
import { legalInvestigationStateTransitions } from "@lab/core/investigation-lifecycle/investigation-state-transitions.const";
import type { LifecycleContext } from "@lab/core/investigation-lifecycle/investigation-state-transitions.types";
import { WakeTrigger } from "@lab/core/investigation-lifecycle/wake-trigger.const";
import { IncompatibleCheckpointError } from "@lab/db/runtime/incompatible-checkpoint";
import type {
    PersistedInvestigationEvent,
    PersistedRuntime,
    RecoverableRuntime
} from "@lab/db/runtime/runtime-persistence.types";
import { AnswerCapabilitySchema } from "@lab/protocol/capabilities/answer-capability.schema";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { Finding } from "@lab/protocol/findings/finding.types";
import {
    EventType,
    type EventType as InvestigationEventType
} from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationEventSchema } from "@lab/protocol/investigation-events/investigation-event.schema";
import type { InvestigationEvent } from "@lab/protocol/investigation-events/investigation-event.types";
import { InvestigationInputSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationInput } from "@lab/protocol/investigation-input/investigation-input.types";
import {
    InvestigationState,
    type InvestigationState as InvestigationStateValue
} from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";
import {
    type InvestigationReportSubject,
    renderInvestigationReport
} from "#src/investigation-workspace/investigation-report";
import {
    type CurrentPointer,
    CurrentPointerStatus,
    readCurrentPointer,
    resolveRunDirectory,
    writeCurrentPointer
} from "#src/investigation-workspace/investigation-run-pointer";
import {
    WorkspaceLayout,
    WorkspaceMutationAction,
    WorkspaceRecoveryLimit
} from "#src/investigation-workspace/investigation-workspace.const";
import type {
    SnapshotUpdater,
    StatusListener,
    WorkspaceMutationResult,
    WorkspaceMutationUpdater,
    WorkspaceRuntimePersistence
} from "#src/investigation-workspace/investigation-workspace.types";

export class InvestigationWorkspace {
    readonly runDirectory: string;
    readonly investigationId: string;
    readonly recovered: boolean;

    private readonly mutex = new Mutex();
    private readonly listeners = new Set<StatusListener>();
    private readonly events: InvestigationEvent[];
    private runtimePersistence: WorkspaceRuntimePersistence | undefined;
    private runtimeRevision: number | undefined;
    private snapshot: StatusSnapshot;

    private constructor(
        runDirectory: string,
        snapshot: StatusSnapshot,
        events: InvestigationEvent[],
        recovered: boolean,
        runtimePersistence?: WorkspaceRuntimePersistence,
        runtimeRevision?: number
    ) {
        this.runDirectory = runDirectory;
        this.investigationId = snapshot.investigation.id;
        this.snapshot = snapshot;
        this.events = events;
        this.recovered = recovered;
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = runtimeRevision;
    }

    static async openOrCreate(
        workspaceRoot: string,
        taskPath: string,
        runtimePersistence?: WorkspaceRuntimePersistence
    ): Promise<InvestigationWorkspace> {
        const requestedTask = InvestigationInputSchema.parse(
            JSON.parse(await readFile(taskPath, "utf8"))
        );
        const current = await readCurrentPointer(workspaceRoot);
        if (current.status === CurrentPointerStatus.VALID) {
            if (runtimePersistence === undefined) {
                const workspace = await InvestigationWorkspace.load(
                    workspaceRoot,
                    current.pointer.run_directory
                );
                const existingTask = await workspace.getTask();
                if (
                    InvestigationWorkspace.isResumable(
                        workspace.getSnapshot().investigation.state
                    ) &&
                    InvestigationWorkspace.tasksMatch(existingTask, requestedTask)
                ) {
                    return workspace;
                }
            } else {
                const workspace = await InvestigationWorkspace.loadFromRuntime(
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
            const recoverable = await InvestigationWorkspace.selectRecoverableRuntime(
                workspaceRoot,
                requestedTask,
                runtimePersistence
            );
            if (recoverable !== undefined) {
                return InvestigationWorkspace.loadPersistedRuntime(
                    workspaceRoot,
                    recoverable,
                    runtimePersistence
                );
            }
        } else if (current.status === CurrentPointerStatus.INVALID) {
            throw current.error;
        }
        return InvestigationWorkspace.initialize(workspaceRoot, taskPath, runtimePersistence);
    }

    static async initialize(
        workspaceRoot: string,
        taskPath: string,
        runtimePersistence?: WorkspaceRuntimePersistence
    ): Promise<InvestigationWorkspace> {
        const task = InvestigationInputSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
        const investigationId = `investigation-${randomUUID()}`;
        const runDirectory = path.join(
            workspaceRoot,
            WorkspaceLayout.RUNS_DIRECTORY,
            investigationId
        );
        const now = new Date().toISOString();
        const snapshot = StatusSnapshotSchema.parse({
            investigation: {
                id: investigationId,
                state: InvestigationState.RUNNING,
                goal: task.goal,
                started_at: now,
                updated_at: now,
                uptime_ms: 0
            }
        });

        await mkdir(runDirectory, { recursive: true });
        const workspace = new InvestigationWorkspace(runDirectory, snapshot, [], false);
        await workspace.writeJson("task.json", task);
        await workspace.persistFilesystemSnapshot();
        if (runtimePersistence !== undefined) {
            await workspace.attachRuntimePersistence(runtimePersistence, task);
        }
        await writeCurrentPointer(workspaceRoot, {
            investigation_id: investigationId,
            run_directory: runDirectory
        });

        return workspace;
    }

    static async load(
        workspaceRoot: string,
        runDirectory: string
    ): Promise<InvestigationWorkspace> {
        const resolvedRunDirectory = resolveRunDirectory(workspaceRoot, runDirectory);
        const [snapshotSource, eventsSource] = await Promise.all([
            readFile(path.join(resolvedRunDirectory, "status.json"), "utf8"),
            readFile(path.join(resolvedRunDirectory, "events.json"), "utf8")
        ]);
        const snapshot = StatusSnapshotSchema.parse(JSON.parse(snapshotSource));
        const events = InvestigationEventSchema.array().parse(JSON.parse(eventsSource));
        return new InvestigationWorkspace(resolvedRunDirectory, snapshot, events, true);
    }

    private static async loadFromRuntime(
        workspaceRoot: string,
        current: CurrentPointer,
        requestedTask: InvestigationInput,
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<InvestigationWorkspace | undefined> {
        resolveRunDirectory(workspaceRoot, current.run_directory);
        const persisted = await InvestigationWorkspace.loadResumableRuntime(
            runtimePersistence,
            current.investigation_id
        );
        if (persisted === undefined) {
            return undefined;
        }
        InvestigationWorkspace.validatePersistedRuntime(
            workspaceRoot,
            persisted,
            current.investigation_id
        );
        if (!InvestigationWorkspace.tasksMatch(persisted.task, requestedTask)) {
            return undefined;
        }
        if (
            !InvestigationWorkspace.isResumable(persisted.checkpoint.snapshot.investigation.state)
        ) {
            return undefined;
        }
        return InvestigationWorkspace.loadPersistedRuntime(
            workspaceRoot,
            persisted,
            runtimePersistence
        );
    }

    /**
     * A checkpoint written before a protocol change describes a run this build cannot act on, so it
     * joins a mismatched task and a failed run as a reason to start fresh rather than resume.
     */
    private static async loadResumableRuntime(
        runtimePersistence: WorkspaceRuntimePersistence,
        investigationId: string
    ): Promise<PersistedRuntime | undefined> {
        try {
            return await runtimePersistence.load(investigationId);
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
    ): Promise<InvestigationWorkspace> {
        InvestigationWorkspace.validatePersistedRuntime(workspaceRoot, persisted);
        const runDirectory = resolveRunDirectory(workspaceRoot, persisted.workspacePath);
        const investigationId = persisted.checkpoint.snapshot.investigation.id;
        const events = await InvestigationWorkspace.readAllRuntimeEvents(
            runtimePersistence,
            investigationId
        );
        await mkdir(runDirectory, { recursive: true });
        const workspace = new InvestigationWorkspace(
            runDirectory,
            persisted.checkpoint.snapshot,
            events,
            true,
            runtimePersistence,
            persisted.checkpoint.revision
        );
        await workspace.writeJson("task.json", persisted.task);
        await workspace.persistFilesystemSnapshot();
        await writeCurrentPointer(workspaceRoot, {
            investigation_id: investigationId,
            run_directory: runDirectory
        });
        return workspace;
    }

    private static async selectRecoverableRuntime(
        workspaceRoot: string,
        requestedTask: InvestigationInput,
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<RecoverableRuntime | undefined> {
        const recoverable = await runtimePersistence.listRecoverable(
            WorkspaceRecoveryLimit.MAX_RECORDS
        );
        const identifierMismatch = recoverable.find(
            ({ task }) =>
                requestedTask.id !== undefined &&
                task.id === requestedTask.id &&
                !InvestigationWorkspace.tasksMatch(task, requestedTask)
        );
        if (identifierMismatch !== undefined) {
            throw new Error(
                `Recoverable task ${requestedTask.id} does not match the requested task input`
            );
        }

        const matching = recoverable
            .filter(({ task }) => InvestigationWorkspace.tasksMatch(task, requestedTask))
            .map((candidate) => {
                InvestigationWorkspace.validatePersistedRuntime(workspaceRoot, candidate);
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
        expectedInvestigationId: string = persisted.checkpoint.snapshot.investigation.id
    ): void {
        const snapshot = StatusSnapshotSchema.parse(persisted.checkpoint.snapshot);
        const task = InvestigationInputSchema.parse(persisted.task);
        if (snapshot.investigation.id !== expectedInvestigationId) {
            throw new Error(
                `Runtime checkpoint does not match investigation ${expectedInvestigationId}`
            );
        }
        if (snapshot.investigation.goal !== task.goal) {
            throw new Error("Persisted runtime checkpoint does not match its task input");
        }
        if (Number.isNaN(Date.parse(persisted.persistedAt))) {
            throw new Error("Persisted runtime checkpoint timestamp is invalid");
        }
        resolveRunDirectory(workspaceRoot, persisted.workspacePath);
    }

    /**
     * A run the daemon reattaches to rather than replacing with a fresh one. That is the lifecycle's
     * own question — a settled run is worth reopening exactly when RUNNING is still reachable from
     * where it settled — so it is read off the state machine instead of being restated here, where a
     * second copy of the rule would drift from the first.
     */
    private static isResumable(state: InvestigationStateValue): boolean {
        return (
            state === InvestigationState.RUNNING ||
            legalInvestigationStateTransitions[state].has(InvestigationState.RUNNING)
        );
    }

    getTask(): Promise<InvestigationInput> {
        return readFile(path.join(this.runDirectory, "task.json"), "utf8").then((value) =>
            InvestigationInputSchema.parse(JSON.parse(value))
        );
    }

    getSnapshot(): StatusSnapshot {
        return structuredClone(this.snapshot);
    }

    getEvents(): InvestigationEvent[] {
        return structuredClone(this.events);
    }

    inspect(id: string): unknown | undefined {
        const snapshot = this.snapshot;
        return (
            snapshot.assumptions.find((assumption) => assumption.id === id) ??
            snapshot.findings.find((finding) => finding.id === id) ??
            snapshot.verdicts.find((verdict) => verdict.id === id) ??
            snapshot.runs.find((run) => run.id === id)
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
        type: InvestigationEventType,
        payload: Readonly<Record<string, unknown>>,
        updater: WorkspaceMutationUpdater = () => WorkspaceMutationAction.COMMIT
    ): Promise<WorkspaceMutationResult | undefined> {
        const mutation = await this.mutex.runExclusive(async () => {
            const event = InvestigationEventSchema.parse({
                id: `event-${randomUUID()}`,
                investigation_id: this.investigationId,
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
        state: InvestigationStateValue,
        reason?: string,
        context: LifecycleContext = {}
    ): Promise<StatusSnapshot> {
        const mutation = await this.mutateWithEvent(
            EventType.INVESTIGATION_STATE_CHANGED,
            {
                state,
                ...(reason === undefined ? {} : { reason }),
                ...(context.wakeTrigger === undefined ? {} : { wake_trigger: context.wakeTrigger })
            },
            (draft) => {
                transitionInvestigationState(draft.investigation.state, state, context);
                draft.investigation.state = state;
                if (reason === undefined) {
                    delete draft.investigation.reason;
                } else {
                    draft.investigation.reason = reason;
                }
            }
        );
        if (mutation === undefined) {
            throw new Error("Investigation state transition was unexpectedly skipped");
        }
        return mutation.snapshot;
    }

    /** Puts the investigation to sleep once its bets are spent, or once nothing can run it. */
    async hibernate(reason: string): Promise<StatusSnapshot> {
        const reportPath = path.join(this.runDirectory, "report.md");
        await writeFileAtomic(
            reportPath,
            renderInvestigationReport(this.reportSubject(), "Hibernation report", reason)
        );
        const mutation = await this.mutateWithEvent(
            EventType.INVESTIGATION_STATE_CHANGED,
            { state: InvestigationState.HIBERNATING, reason },
            (draft) => {
                transitionInvestigationState(
                    draft.investigation.state,
                    InvestigationState.HIBERNATING
                );
                draft.investigation.state = InvestigationState.HIBERNATING;
                draft.investigation.reason = reason;
                draft.result = { summary: reason, report_path: reportPath, limitations: [] };
            }
        );
        if (mutation === undefined) {
            throw new Error("Investigation hibernation was unexpectedly skipped");
        }
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.INVESTIGATION_HIBERNATED, { reason });
        return mutation.snapshot;
    }

    /**
     * The investigation's one terminal success. It is reachable only from a finding a verifier confirmed, so
     * the confirmed finding is the argument rather than a summary the caller composed.
     */
    async recordBreakthrough(finding: Finding): Promise<StatusSnapshot> {
        const verdict = this.snapshot.verdicts.find(({ finding_id }) => finding_id === finding.id);
        if (verdict === undefined || !verdict.confirmed) {
            throw new Error(`Finding ${finding.id} carries no confirming verdict`);
        }
        const reportPath = path.join(this.runDirectory, "report.md");
        const resultPath = path.join(this.runDirectory, "result.json");
        await Promise.all([
            writeFileAtomic(
                reportPath,
                renderInvestigationReport(this.reportSubject(), "Breakthrough", finding.claim)
            ),
            this.writeJson("result.json", {
                investigation_id: this.investigationId,
                status: InvestigationState.BREAKTHROUGH,
                claim: finding.claim,
                work: finding.work,
                artifact_paths: finding.artifact_paths,
                verdict: verdict.reasoning,
                finding_id: finding.id,
                verdict_id: verdict.id,
                recorded_at: new Date().toISOString()
            })
        ]);
        const context: LifecycleContext = { confirmedFindingId: finding.id };
        const mutation = await this.mutateWithEvent(
            EventType.INVESTIGATION_STATE_CHANGED,
            {
                state: InvestigationState.BREAKTHROUGH,
                finding_id: finding.id,
                verdict_id: verdict.id
            },
            (draft) => {
                transitionInvestigationState(
                    draft.investigation.state,
                    InvestigationState.BREAKTHROUGH,
                    context
                );
                draft.investigation.state = InvestigationState.BREAKTHROUGH;
                draft.investigation.reason = finding.claim;
                draft.breakthrough_finding_id = finding.id;
                draft.result = {
                    summary: finding.claim,
                    report_path: reportPath,
                    result_path: resultPath,
                    limitations: []
                };
            }
        );
        if (mutation === undefined) {
            throw new Error("Breakthrough was unexpectedly skipped");
        }
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.BREAKTHROUGH_RECORDED, {
            finding_id: finding.id,
            verdict_id: verdict.id,
            result_path: resultPath
        });
        return mutation.snapshot;
    }

    async appendEvent(
        type: InvestigationEventType,
        payload: Record<string, unknown>
    ): Promise<InvestigationEvent> {
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
                shouldWake = draft.investigation.state === InvestigationState.HIBERNATING;
                request.status = CapabilityStatus.ANSWERED;
                request.answer = normalizedAnswer;
                request.answered_at = event.occurred_at;
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
            EventType.INVESTIGATION_STATE_CHANGED,
            { state: InvestigationState.RUNNING, reason, wake_trigger: wakeTrigger },
            (draft) => {
                if (draft.investigation.state !== InvestigationState.HIBERNATING) {
                    return WorkspaceMutationAction.SKIP;
                }
                transitionInvestigationState(
                    draft.investigation.state,
                    InvestigationState.RUNNING,
                    { wakeTrigger }
                );
                draft.investigation.state = InvestigationState.RUNNING;
                draft.investigation.reason = reason;
                return WorkspaceMutationAction.COMMIT;
            }
        );
    }

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
        task: InvestigationInput
    ): Promise<void> {
        const persisted = await runtimePersistence.load(this.investigationId);
        if (persisted !== undefined) {
            if (!InvestigationWorkspace.tasksMatch(persisted.task, task)) {
                throw new Error("Persisted runtime task does not match task.json");
            }
            if (path.resolve(persisted.workspacePath) !== path.resolve(this.runDirectory)) {
                throw new Error("Persisted runtime workspace does not match the run directory");
            }
            const checkpoint = persisted.checkpoint;
            this.runtimePersistence = runtimePersistence;
            this.runtimeRevision = checkpoint.revision;
            this.snapshot = checkpoint.snapshot;
            const events = await InvestigationWorkspace.readAllRuntimeEvents(
                runtimePersistence,
                this.investigationId
            );
            this.events.splice(0, this.events.length, ...events);
            await this.persistFilesystemSnapshot();
            return;
        }

        const [firstEvent, ...remainingEvents] = this.events;
        let initialized = await runtimePersistence.initialize({
            task,
            workspacePath: this.runDirectory,
            snapshot: this.snapshot,
            ...(firstEvent === undefined ? {} : { event: firstEvent })
        });
        for (const event of remainingEvents) {
            initialized = await runtimePersistence.commit({
                snapshot: this.snapshot,
                expectedRevision: initialized.revision,
                event
            });
        }
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = initialized.revision;
        this.snapshot = initialized.snapshot;
        await this.persistFilesystemSnapshot();
    }

    private async commitRuntime(
        snapshot: StatusSnapshot,
        event?: InvestigationEvent
    ): Promise<StatusSnapshot> {
        if (this.runtimePersistence === undefined) {
            return snapshot;
        }
        if (this.runtimeRevision === undefined) {
            throw new Error("Runtime persistence is attached without a revision");
        }
        const committed = await this.runtimePersistence.commit({
            snapshot,
            expectedRevision: this.runtimeRevision,
            ...(event === undefined ? {} : { event })
        });
        this.runtimeRevision = committed.revision;
        return committed.snapshot;
    }

    private touch(snapshot: StatusSnapshot): void {
        const now = new Date();
        snapshot.investigation.updated_at = now.toISOString();
        snapshot.investigation.uptime_ms = Math.max(
            0,
            now.getTime() - new Date(snapshot.investigation.started_at).getTime()
        );
    }

    private async persistFilesystemSnapshot(): Promise<void> {
        await Promise.all([
            this.writeJson("status.json", this.snapshot),
            this.writeJson("events.json", this.events),
            this.writeJson("assumptions.json", this.researchJournal())
        ]);
    }

    /** The run's readable history: each bet with what was claimed under it and what came back. */
    private researchJournal(): unknown {
        return this.snapshot.assumptions.map((assumption) => ({
            ...assumption,
            findings: this.snapshot.findings
                .filter(({ assumption_id }) => assumption_id === assumption.id)
                .map((finding) => ({
                    ...finding,
                    verdict: this.snapshot.verdicts.find(
                        ({ finding_id }) => finding_id === finding.id
                    )
                }))
        }));
    }

    private static async readAllRuntimeEvents(
        runtimePersistence: WorkspaceRuntimePersistence,
        investigationId: string
    ): Promise<InvestigationEvent[]> {
        const events: InvestigationEvent[] = [];
        let cursor = 0;
        for (;;) {
            const page = await runtimePersistence.eventsAfter(investigationId, cursor, 1_000);
            if (page.length === 0) {
                return events;
            }
            events.push(...page.map(InvestigationWorkspace.toInvestigationEvent));
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

    private static toInvestigationEvent(event: PersistedInvestigationEvent): InvestigationEvent {
        return {
            id: event.id,
            investigation_id: event.investigation_id,
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

    private reportSubject(): InvestigationReportSubject {
        return {
            snapshot: this.snapshot,
            runDirectory: this.runDirectory
        };
    }

    private static tasksMatch(left: InvestigationInput, right: InvestigationInput): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}
