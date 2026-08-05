import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { transitionInvestigationState } from "@openlab/core/investigation-lifecycle/investigation-state-transitions";
import type { LifecycleContext } from "@openlab/core/investigation-lifecycle/investigation-state-transitions.types";
import { WakeTrigger } from "@openlab/core/investigation-lifecycle/wake-trigger.const";
import type {
    PersistedInvestigationEvent,
    PersistedRuntime
} from "@openlab/db/runtime/runtime-persistence.types";
import { AnswerCapabilitySchema } from "@openlab/protocol/capabilities/answer-capability.schema";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "@openlab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@openlab/protocol/capabilities/capability-request.types";
import type { Finding } from "@openlab/protocol/findings/finding.types";
import {
    EventType,
    type EventType as InvestigationEventType
} from "@openlab/protocol/investigation-events/event-type.const";
import { InvestigationEventSchema } from "@openlab/protocol/investigation-events/investigation-event.schema";
import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import { InvestigationDispatchSchema } from "@openlab/protocol/investigation-input/investigation-dispatch.schema";
import type { InvestigationDispatch } from "@openlab/protocol/investigation-input/investigation-dispatch.types";
import { InvestigationInputSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationInput } from "@openlab/protocol/investigation-input/investigation-input.types";
import {
    InvestigationState,
    type InvestigationState as InvestigationStateValue
} from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { StatusSnapshotSchema } from "@openlab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";
import {
    type InvestigationReportSubject,
    renderInvestigationReport
} from "#src/investigation-workspace/investigation-report";
import { resolveRunDirectory } from "#src/investigation-workspace/investigation-run-directory";
import {
    WorkspaceFile,
    WorkspaceLayout,
    WorkspaceMutationAction
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
    private task: InvestigationInput;

    /**
     * What the operator asked this investigation to do. The goal it is chasing is fixed for the life
     * of the run; what it dispatches to is theirs to move, and every dispatch decision reads it here
     * so a change reaches the next agent without the investigation being reopened.
     */
    get input(): InvestigationInput {
        return this.task;
    }

    private constructor(
        runDirectory: string,
        snapshot: StatusSnapshot,
        input: InvestigationInput,
        events: InvestigationEvent[],
        recovered: boolean,
        runtimePersistence?: WorkspaceRuntimePersistence,
        runtimeRevision?: number
    ) {
        this.runDirectory = runDirectory;
        this.investigationId = snapshot.investigation.id;
        this.task = input;
        this.snapshot = snapshot;
        this.events = events;
        this.recovered = recovered;
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = runtimeRevision;
    }

    /** Opens a run directory for an investigation the operator just asked the lab to take on. */
    static async create(
        workspaceRoot: string,
        requestedInput: InvestigationInput,
        runtimePersistence?: WorkspaceRuntimePersistence
    ): Promise<InvestigationWorkspace> {
        const input = InvestigationInputSchema.parse(requestedInput);
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
                goal: input.goal,
                started_at: now,
                updated_at: now,
                uptime_ms: 0
            }
        });

        await mkdir(runDirectory, { recursive: true });
        const workspace = new InvestigationWorkspace(runDirectory, snapshot, input, [], false);
        await workspace.writeJson(WorkspaceFile.INPUT, input);
        await workspace.persistFilesystemSnapshot();
        if (runtimePersistence !== undefined) {
            await workspace.startRuntimePersistence(runtimePersistence);
        }

        return workspace;
    }

    /**
     * Reopens an investigation the lab already holds. The database checkpoint is the truth: the run
     * directory is rewritten from it, which is also how a corrupt or half-written file is repaired.
     */
    static async open(
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
            persisted.task,
            events,
            true,
            runtimePersistence,
            persisted.checkpoint.revision
        );
        await workspace.writeJson(WorkspaceFile.INPUT, persisted.task);
        await workspace.persistFilesystemSnapshot();
        return workspace;
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
                delete draft.investigation.resume_at;
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

    /**
     * Moves what the investigation dispatches to, and whether the lab's spend caps hold it. The
     * roster is read when a research loop starts, so the caller decides what to do with the loop
     * that is already running under the old one; this settles what the next one will read.
     */
    async changeDispatch(dispatch: InvestigationDispatch): Promise<InvestigationInput> {
        const changed = InvestigationInputSchema.parse({
            ...this.task,
            ...InvestigationDispatchSchema.parse(dispatch)
        });
        this.task = await this.persistTask(changed);
        await this.writeJson(WorkspaceFile.INPUT, this.task);
        await this.appendEvent(EventType.INVESTIGATION_DISPATCH_CHANGED, {
            harness_kinds: this.task.harness_kinds,
            spend_past_caps: this.task.spend_past_caps
        });
        return this.task;
    }

    /**
     * Puts the investigation to sleep once its bets are spent, or once nothing can run it. A wait
     * that has a stated end — a subscription window that resets — carries the moment it comes back,
     * and the investigation takes itself up again then; a sleep nobody can date waits for a person.
     */
    async hibernate(reason: string, resumeAt?: string): Promise<StatusSnapshot> {
        const reportPath = path.join(this.runDirectory, WorkspaceFile.REPORT);
        await writeFileAtomic(
            reportPath,
            renderInvestigationReport(this.reportSubject(), "Hibernation report", reason)
        );
        const mutation = await this.mutateWithEvent(
            EventType.INVESTIGATION_STATE_CHANGED,
            {
                state: InvestigationState.HIBERNATING,
                reason,
                ...(resumeAt === undefined ? {} : { resume_at: resumeAt })
            },
            (draft) => {
                transitionInvestigationState(
                    draft.investigation.state,
                    InvestigationState.HIBERNATING
                );
                draft.investigation.state = InvestigationState.HIBERNATING;
                draft.investigation.reason = reason;
                if (resumeAt === undefined) {
                    delete draft.investigation.resume_at;
                } else {
                    draft.investigation.resume_at = resumeAt;
                }
                draft.result = { summary: reason, report_path: reportPath, limitations: [] };
            }
        );
        if (mutation === undefined) {
            throw new Error("Investigation hibernation was unexpectedly skipped");
        }
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.INVESTIGATION_HIBERNATED, {
            reason,
            ...(resumeAt === undefined ? {} : { resume_at: resumeAt })
        });
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
        const reportPath = path.join(this.runDirectory, WorkspaceFile.REPORT);
        const resultPath = path.join(this.runDirectory, WorkspaceFile.RESULT);
        await Promise.all([
            writeFileAtomic(
                reportPath,
                renderInvestigationReport(this.reportSubject(), "Breakthrough", finding.claim)
            ),
            this.writeJson(WorkspaceFile.RESULT, {
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

    /**
     * Puts a sleeping investigation back to work, and does nothing to one that is awake, stopped or
     * finished. Whatever revived it — an answered capability, a subscription window that reset —
     * arrives asynchronously and may well arrive after the operator has moved the run somewhere
     * else, so the state is checked inside the mutation rather than before it.
     */
    async wakeIfHibernating(reason: string, wakeTrigger: WakeTrigger): Promise<void> {
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
                delete draft.investigation.resume_at;
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

    /** Writes the row and the first checkpoint a freshly created investigation is committed from. */
    private async startRuntimePersistence(
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<void> {
        const initialized = await runtimePersistence.initialize({
            task: this.input,
            workspacePath: this.runDirectory,
            snapshot: this.snapshot
        });
        this.runtimePersistence = runtimePersistence;
        this.runtimeRevision = initialized.revision;
        this.snapshot = initialized.snapshot;
        await this.persistFilesystemSnapshot();
    }

    /** A lab with no database keeps the change in the run directory, exactly as it does its status. */
    private async persistTask(task: InvestigationInput): Promise<InvestigationInput> {
        return this.runtimePersistence === undefined
            ? task
            : this.runtimePersistence.retask(this.investigationId, task);
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
            this.writeJson(WorkspaceFile.STATUS, this.snapshot),
            this.writeJson(WorkspaceFile.EVENTS, this.events),
            this.writeJson(WorkspaceFile.ASSUMPTIONS, this.researchJournal())
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
}
