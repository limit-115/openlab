import type { LifecycleContext } from "@nightlab/core/investigation-lifecycle/investigation-state-transitions.types";
import type { InvestigationInput } from "@nightlab/protocol/investigation-input/investigation-input.types";
import type { InvestigationState as InvestigationStateValue } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
import type { investigations } from "#src/lab-database/lab-schema";

export type InvestigationRecord = typeof investigations.$inferSelect;

export interface CreateInvestigationInput {
    readonly id: string;
    readonly input: InvestigationInput;
    readonly workspacePath: string;
    readonly now?: Date;
}

export interface PersistLifecycleInput {
    readonly investigationId: string;
    readonly expectedState: InvestigationStateValue;
    readonly state: InvestigationStateValue;
    readonly context?: LifecycleContext;
    readonly reason?: string;
    readonly now?: Date;
}
