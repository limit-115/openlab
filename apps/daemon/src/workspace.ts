import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { LabEvent, LabState, TaskInput } from "@lab/protocol/schemas";
import { TaskInputSchema } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { StatusSnapshotSchema } from "@lab/protocol/status";
import { Mutex } from "async-mutex";
import writeFileAtomic from "write-file-atomic";

type StatusListener = (event: LabEvent, snapshot: StatusSnapshot) => void;
type SnapshotUpdater = (draft: StatusSnapshot) => void;

export class LabWorkspace {
    readonly runDirectory: string;
    readonly labId: string;

    private readonly mutex = new Mutex();
    private readonly listeners = new Set<StatusListener>();
    private readonly events: LabEvent[];
    private snapshot: StatusSnapshot;

    private constructor(runDirectory: string, snapshot: StatusSnapshot, events: LabEvent[]) {
        this.runDirectory = runDirectory;
        this.labId = snapshot.lab.id;
        this.snapshot = snapshot;
        this.events = events;
    }

    static async initialize(workspaceRoot: string, taskPath: string): Promise<LabWorkspace> {
        const task = TaskInputSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
        const labId = `lab-${randomUUID()}`;
        const runDirectory = path.join(workspaceRoot, "runs", labId);
        const now = new Date().toISOString();
        const snapshot = StatusSnapshotSchema.parse({
            lab: {
                id: labId,
                state: "RUNNING",
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
                    status: "active",
                    progress: "Queued"
                }
            ],
            agents: [
                {
                    id: "agent-director",
                    branch_id: "branch-director",
                    role: "director",
                    status: "working",
                    current_task_id: "task-understand"
                }
            ],
            tasks: [
                {
                    id: "task-understand",
                    branch_id: "branch-director",
                    objective: "Turn the goal into testable claims without prescribing a method",
                    context_refs: [],
                    status: "queued",
                    attempt: 1,
                    role: "director"
                }
            ]
        });

        await mkdir(runDirectory, { recursive: true });
        const workspace = new LabWorkspace(runDirectory, snapshot, []);
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

    async transition(state: LabState, reason?: string): Promise<StatusSnapshot> {
        const snapshot = await this.update((draft) => {
            draft.lab.state = state;
            if (reason === undefined) {
                delete draft.lab.reason;
            } else {
                draft.lab.reason = reason;
            }
        });
        await this.appendEvent("lab.state_changed", { state, reason });
        return snapshot;
    }

    async appendEvent(type: string, payload: Record<string, unknown>): Promise<LabEvent> {
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
            request.status = "provided";
            provided = true;
        });
        if (provided) {
            await this.appendEvent("capability.provided", {
                request_id: id,
                resource_reference: resourceReference
            });
        }
        return provided;
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
}
