import type { LifecycleContext } from "@lab/core/lab-lifecycle/lab-state-transitions.types";
import type { LabState as LabStateValue } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import type { labs } from "#src/lab-database/lab-schema";

export type LabRecord = typeof labs.$inferSelect;

export interface CreateLabInput {
    readonly id: string;
    readonly input: TaskInput;
    readonly workspacePath: string;
    readonly now?: Date;
}

export interface PersistLifecycleInput {
    readonly labId: string;
    readonly expectedState: LabStateValue;
    readonly state: LabStateValue;
    readonly context?: LifecycleContext;
    readonly reason?: string;
    readonly now?: Date;
}
