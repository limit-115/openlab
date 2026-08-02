import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { WakeTrigger } from "@lab/core/constants";
import type { LifecycleContext } from "@lab/core/lifecycle";
import { transitionLabState } from "@lab/core/lifecycle";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityRequestType,
    CapabilityStatus,
    EventType,
    InternalTaskStatus,
    type EventType as LabEventType,
    LabState,
    type LabState as LabStateValue
} from "@lab/protocol/constants";
import type { CapabilityRequest, LabEvent, TaskInput } from "@lab/protocol/schemas";
import { LabEventSchema, TaskInputSchema } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { StatusSnapshotSchema } from "@lab/protocol/status";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";

type StatusListener = (event: LabEvent, snapshot: StatusSnapshot) => void;
type SnapshotUpdater = (draft: StatusSnapshot) => void;

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
    private snapshot: StatusSnapshot;

    private constructor(
        runDirectory: string,
        snapshot: StatusSnapshot,
        events: LabEvent[],
        recovered: boolean
    ) {
        this.runDirectory = runDirectory;
        this.labId = snapshot.lab.id;
        this.snapshot = snapshot;
        this.events = events;
        this.recovered = recovered;
    }

    static async openOrCreate(workspaceRoot: string, taskPath: string): Promise<LabWorkspace> {
        const requestedTask = TaskInputSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
        const current = await LabWorkspace.readCurrentPointer(workspaceRoot);
        if (current !== undefined) {
            const workspace = await LabWorkspace.load(workspaceRoot, current.run_directory);
            const existingTask = await workspace.getTask();
            const state = workspace.getSnapshot().lab.state;
            const recoverable = state === LabState.RUNNING || state === LabState.HIBERNATING;
            if (recoverable && LabWorkspace.tasksMatch(existingTask, requestedTask)) {
                return workspace;
            }
        }
        return LabWorkspace.initialize(workspaceRoot, taskPath);
    }

    static async initialize(workspaceRoot: string, taskPath: string): Promise<LabWorkspace> {
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
        const workspace = new LabWorkspace(runDirectory, snapshot, [], false);
        await Promise.all([
            workspace.writeJson("task.json", task),
            workspace.persistSnapshot(),
            writeFileAtomic(
                path.join(workspaceRoot, "current.json"),
                `${JSON.stringify({ lab_id: labId, run_directory: runDirectory }, null, 4)}\n`
            )
        ]);

        return workspace;
    }

    static async load(workspaceRoot: string, runDirectory: string): Promise<LabWorkspace> {
        const root = path.resolve(workspaceRoot);
        const resolvedRunDirectory = path.resolve(runDirectory);
        if (!resolvedRunDirectory.startsWith(`${root}${path.sep}`)) {
            throw new Error("Current run directory escapes LAB_HOME");
        }
        const [snapshotSource, eventsSource] = await Promise.all([
            readFile(path.join(resolvedRunDirectory, "status.json"), "utf8"),
            readFile(path.join(resolvedRunDirectory, "events.json"), "utf8")
        ]);
        const snapshot = StatusSnapshotSchema.parse(JSON.parse(snapshotSource));
        const events = LabEventSchema.array().parse(JSON.parse(eventsSource));
        return new LabWorkspace(resolvedRunDirectory, snapshot, events, true);
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

    inspect(id: string): unknown | undefined {
        const snapshot = this.snapshot;
        return (
            snapshot.claims.find((claim) => claim.id === id) ??
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
            this.snapshot = StatusSnapshotSchema.parse(draft);
            await this.persistSnapshot();
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
        return snapshot;
    }

    async complete(result: VerifiedResult): Promise<StatusSnapshot> {
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
        return snapshot;
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
            this.events.push(event);
            const draft = structuredClone(this.snapshot);
            draft.recent_events = this.events.slice(-200);
            this.touch(draft);
            this.snapshot = StatusSnapshotSchema.parse(draft);
            await this.persistSnapshot();
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

    private touch(snapshot: StatusSnapshot): void {
        const now = new Date();
        snapshot.lab.updated_at = now.toISOString();
        snapshot.lab.uptime_ms = Math.max(
            0,
            now.getTime() - new Date(snapshot.lab.started_at).getTime()
        );
        snapshot.frontier.updated_at = snapshot.lab.updated_at;
    }

    private async persistSnapshot(): Promise<void> {
        await Promise.all([
            this.writeJson("status.json", this.snapshot),
            this.writeJson("events.json", this.events),
            this.writeJson("claims.json", this.snapshot.claims),
            this.writeJson("experiments.json", this.snapshot.experiments)
        ]);
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
