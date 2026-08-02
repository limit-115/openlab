import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { WakeTrigger } from "@lab/core/constants";
import type { LifecycleContext } from "@lab/core/lifecycle";
import { transitionLabState } from "@lab/core/lifecycle";
import type { PersistedLabEvent, RuntimePersistence } from "@lab/db/runtime";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityRequestType,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    InternalTaskStatus,
    type EventType as LabEventType,
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/constants";
import type { CapabilityRequest, Evidence, LabEvent, TaskInput } from "@lab/protocol/schemas";
import { EvidenceSchema, LabEventSchema, TaskInputSchema } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { StatusSnapshotSchema } from "@lab/protocol/status";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";
import { validateFileArtifact } from "#src/artifact";

type StatusListener = (event: LabEvent, snapshot: StatusSnapshot) => void;
type SnapshotUpdater = (draft: StatusSnapshot) => void;
export type WorkspaceRuntimePersistence = Pick<
    RuntimePersistence,
    "initialize" | "load" | "commit" | "eventsAfter"
>;

export interface VerifiedResult {
    summary: string;
    supportingEvidenceIds: readonly string[];
    independentVerifierVerdictId: string;
    limitations: readonly string[];
    knownCounterexamples: readonly string[];
}

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
        const current = await LabWorkspace.readCurrentPointer(workspaceRoot);
        if (current !== undefined) {
            const workspace =
                runtimePersistence === undefined
                    ? await LabWorkspace.load(workspaceRoot, current.run_directory)
                    : await LabWorkspace.loadFromRuntime(
                          workspaceRoot,
                          current,
                          runtimePersistence
                      );
            const existingTask = await workspace.getTask();
            const state = workspace.getSnapshot().lab.state;
            const recoverable = state === LabState.RUNNING || state === LabState.HIBERNATING;
            if (recoverable && LabWorkspace.tasksMatch(existingTask, requestedTask)) {
                return workspace;
            }
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
                    id: "branch-director",
                    title: "Goal operationalization",
                    approach: "Clarify claims, evaluators, and independent research directions",
                    status: BranchStatus.ACTIVE,
                    progress: "Queued"
                }
            ],
            agents: [
                {
                    id: "agent-director",
                    branch_id: "branch-director",
                    role: AgentRole.DIRECTOR,
                    status: AgentStatus.WORKING,
                    current_task_id: "task-understand"
                }
            ],
            tasks: [
                {
                    id: "task-understand",
                    branch_id: "branch-director",
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
        await writeFileAtomic(
            path.join(workspaceRoot, "current.json"),
            `${JSON.stringify({ lab_id: labId, run_directory: runDirectory }, null, 4)}\n`
        );

        return workspace;
    }

    static async load(workspaceRoot: string, runDirectory: string): Promise<LabWorkspace> {
        const resolvedRunDirectory = LabWorkspace.resolveRunDirectory(workspaceRoot, runDirectory);
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
        current: { lab_id: string; run_directory: string },
        runtimePersistence: WorkspaceRuntimePersistence
    ): Promise<LabWorkspace> {
        const runDirectory = LabWorkspace.resolveRunDirectory(workspaceRoot, current.run_directory);
        const checkpoint = await runtimePersistence.load(current.lab_id);
        if (checkpoint === undefined) {
            const workspace = await LabWorkspace.load(workspaceRoot, runDirectory);
            await workspace.attachRuntimePersistence(runtimePersistence, await workspace.getTask());
            return workspace;
        }
        if (checkpoint.snapshot.lab.id !== current.lab_id) {
            throw new Error("Runtime checkpoint does not match current.json");
        }

        const [storedEvidence, events] = await Promise.all([
            LabWorkspace.readOptionalEvidence(runDirectory),
            LabWorkspace.readAllRuntimeEvents(runtimePersistence, current.lab_id)
        ]);
        const workspace = new LabWorkspace(
            runDirectory,
            checkpoint.snapshot,
            events,
            storedEvidence,
            true,
            runtimePersistence,
            checkpoint.revision
        );
        await workspace.persistFilesystemSnapshot();
        return workspace;
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

    async transition(
        state: LabStateValue,
        reason?: string,
        context: LifecycleContext = {}
    ): Promise<StatusSnapshot> {
        transitionLabState(this.snapshot.lab.state, state, context);
        const snapshot = await this.update((draft) => {
            draft.lab.state = state;
            if (reason === undefined) {
                delete draft.lab.reason;
            } else {
                draft.lab.reason = reason;
            }
        });
        await this.appendEvent(EventType.LAB_STATE_CHANGED, { state, reason });
        return snapshot;
    }

    async hibernateForPlateau(reason: string): Promise<StatusSnapshot> {
        const reportPath = path.join(this.runDirectory, "report.md");
        await writeFileAtomic(reportPath, this.renderReport("Plateau report", reason));
        const snapshot = await this.update((draft) => {
            transitionLabState(draft.lab.state, LabState.HIBERNATING, { plateauConfirmed: true });
            draft.lab.state = LabState.HIBERNATING;
            draft.lab.reason = reason;
            draft.result = {
                summary: reason,
                report_path: reportPath,
                limitations: [...draft.frontier.blockers]
            };
        });
        await this.appendEvent(EventType.LAB_STATE_CHANGED, {
            state: LabState.HIBERNATING,
            reason
        });
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.LAB_HIBERNATED, { reason });
        return snapshot;
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
            writeFileAtomic(reportPath, this.renderReport("Verified result", result.summary)),
            this.writeJson("result.json", resultFile)
        ]);
        const snapshot = await this.update((draft) => {
            draft.lab.state = LabState.COMPLETED;
            delete draft.lab.reason;
            draft.result = {
                summary: result.summary,
                report_path: reportPath,
                result_path: resultPath,
                limitations: [...result.limitations]
            };
        });
        await this.appendEvent(EventType.LAB_STATE_CHANGED, {
            state: LabState.COMPLETED,
            verifier_verdict_id: result.independentVerifierVerdictId
        });
        await this.appendEvent(EventType.REPORT_GENERATED, { report_path: reportPath });
        await this.appendEvent(EventType.RESULT_GENERATED, {
            result_path: resultPath,
            supporting_evidence_ids: supportingEvidence.map(({ id }) => id)
        });
        await this.appendEvent(EventType.LAB_COMPLETED, {
            verifier_verdict_id: result.independentVerifierVerdictId
        });
        return snapshot;
    }

    async recordEvidence(candidate: Evidence): Promise<Evidence> {
        const evidence = EvidenceSchema.parse(candidate);
        await this.validateStoredEvidenceArtifact(evidence);

        return this.mutex.runExclusive(async () => {
            const existing = this.evidence.find(({ id }) => id === evidence.id);
            if (existing !== undefined) {
                if (JSON.stringify(existing) !== JSON.stringify(evidence)) {
                    throw new Error(
                        `Evidence id already exists with different content: ${evidence.id}`
                    );
                }
                return structuredClone(existing);
            }
            this.evidence.push(evidence);
            await this.writeJson("evidence.json", this.evidence);
            return structuredClone(evidence);
        });
    }

    async appendEvent(type: LabEventType, payload: Record<string, unknown>): Promise<LabEvent> {
        const event = await this.mutex.runExclusive(async () => {
            const event: LabEvent = {
                id: `event-${randomUUID()}`,
                lab_id: this.labId,
                type,
                occurred_at: new Date().toISOString(),
                payload
            };
            const draft = structuredClone(this.snapshot);
            draft.recent_events = [...this.events, event].slice(-200);
            this.touch(draft);
            const parsed = StatusSnapshotSchema.parse(draft);
            this.snapshot = await this.commitRuntime(parsed, event);
            this.events.push(event);
            await this.persistFilesystemSnapshot();
            return event;
        });
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) {
            listener(event, snapshot);
        }
        return event;
    }

    async provideCapability(id: string, resourceReference: string): Promise<boolean> {
        let provided = false;
        await this.update((draft) => {
            const request = draft.capability_requests.find((candidate) => candidate.id === id);
            if (request === undefined) {
                return;
            }
            request.status = CapabilityStatus.PROVIDED;
            provided = true;
        });
        if (provided) {
            await this.appendEvent(EventType.CAPABILITY_PROVIDED, {
                request_id: id,
                resource_reference: resourceReference
            });
            if (this.snapshot.lab.state === LabState.HIBERNATING) {
                await this.transition(LabState.RUNNING, `Capability ${id} provided`, {
                    wakeTrigger: WakeTrigger.CAPABILITY
                });
            }
        }
        return provided;
    }

    async requestCapability(input: {
        need: string;
        reason: string;
        provisioningHint: string;
    }): Promise<CapabilityRequest> {
        const request: CapabilityRequest = {
            id: `capability-${randomUUID()}`,
            type: CapabilityRequestType.CAPABILITY_REQUEST,
            need: input.need,
            reason: input.reason,
            provisioning_hint: input.provisioningHint,
            status: CapabilityStatus.OPEN,
            created_at: new Date().toISOString()
        };
        let selected: CapabilityRequest = request;
        await this.update((draft) => {
            const existing = draft.capability_requests.find(
                (candidate) =>
                    candidate.status === CapabilityStatus.OPEN && candidate.need === input.need
            );
            if (existing !== undefined) {
                selected = existing;
                return;
            }
            draft.capability_requests.push(request);
            if (!draft.frontier.blockers.includes(request.need)) {
                draft.frontier.blockers.push(request.need);
            }
        });
        if (selected.id !== request.id) {
            return structuredClone(selected);
        }
        await this.appendEvent(EventType.CAPABILITY_REQUESTED, {
            request_id: request.id,
            need: request.need,
            reason: request.reason
        });
        return structuredClone(request);
    }

    private async attachRuntimePersistence(
        runtimePersistence: WorkspaceRuntimePersistence,
        task: TaskInput
    ): Promise<void> {
        const checkpoint = await runtimePersistence.load(this.labId);
        if (checkpoint !== undefined) {
            if (checkpoint.snapshot.lab.goal !== task.goal) {
                throw new Error("Runtime checkpoint goal does not match task.json");
            }
            this.runtimePersistence = runtimePersistence;
            this.runtimeRevision = checkpoint.revision;
            this.snapshot = checkpoint.snapshot;
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
        event?: LabEvent
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
                ({ kind, supports }) => kind !== EvidenceKind.VERIFIER_RESULT && supports
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

    private static resolveRunDirectory(workspaceRoot: string, runDirectory: string): string {
        const root = path.resolve(workspaceRoot);
        const resolvedRunDirectory = path.resolve(runDirectory);
        if (!resolvedRunDirectory.startsWith(`${root}${path.sep}`)) {
            throw new Error("Current run directory escapes LAB_HOME");
        }
        return resolvedRunDirectory;
    }

    private writeJson(fileName: string, value: unknown): Promise<void> {
        return writeFileAtomic(
            path.join(this.runDirectory, fileName),
            `${JSON.stringify(value, null, 4)}\n`
        );
    }

    private renderReport(title: string, summary: string): string {
        const snapshot = this.snapshot;
        const claims = snapshot.claims.length
            ? snapshot.claims.map((claim) => `- [${claim.status}] ${claim.statement}`).join("\n")
            : "- No claims recorded.";
        const blockers = snapshot.frontier.blockers.length
            ? snapshot.frontier.blockers.map((blocker) => `- ${blocker}`).join("\n")
            : "- None.";
        return `# ${title}\n\n## Goal\n\n${snapshot.lab.goal}\n\n## Summary\n\n${summary}\n\n## Claims\n\n${claims}\n\n## Blockers and limitations\n\n${blockers}\n`;
    }

    private static async readCurrentPointer(
        workspaceRoot: string
    ): Promise<{ lab_id: string; run_directory: string } | undefined> {
        try {
            const source = await readFile(path.join(workspaceRoot, "current.json"), "utf8");
            const value: unknown = JSON.parse(source);
            if (
                typeof value !== "object" ||
                value === null ||
                !("lab_id" in value) ||
                !("run_directory" in value) ||
                typeof value.lab_id !== "string" ||
                typeof value.run_directory !== "string"
            ) {
                throw new Error("Invalid current.json pointer");
            }
            return { lab_id: value.lab_id, run_directory: value.run_directory };
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
    }

    private static tasksMatch(left: TaskInput, right: TaskInput): boolean {
        if (left.id !== undefined || right.id !== undefined) {
            return left.id !== undefined && left.id === right.id;
        }
        return JSON.stringify(left) === JSON.stringify(right);
    }
}
