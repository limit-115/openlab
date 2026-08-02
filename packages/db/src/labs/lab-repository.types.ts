import type { LifecycleContext } from "@lab/core/lab-lifecycle/lab-state-transitions.types";
import type { LabState as LabStateValue } from "@lab/protocol/constants";
import type { TaskInput } from "@lab/protocol/schemas";
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
