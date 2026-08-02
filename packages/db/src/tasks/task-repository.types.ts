import type { SchedulerLane } from "@lab/core/scheduling/scheduler-lane.const";
import type { AgentRole } from "@lab/protocol/constants";
import type { attempts, tasks } from "#src/lab-database/lab-schema";
import type {
    AttemptStatus,
    AttemptStatus as AttemptStatusValue,
    ExternalEffect as ExternalEffectValue
} from "#src/tasks/attempt-execution.const";

export type TaskRecord = typeof tasks.$inferSelect;
export type AttemptRecord = typeof attempts.$inferSelect;

export type FinishedAttemptStatus = Exclude<
    AttemptStatusValue,
    typeof AttemptStatus.PLANNED | typeof AttemptStatus.RUNNING
>;

export interface QueueTaskInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId: string;
    readonly objective: string;
    readonly contextRefs?: readonly string[];
    readonly role: AgentRole;
    readonly lane: SchedulerLane;
    readonly priority?: number;
    readonly availableAt?: Date;
}

export interface LeaseTaskInput {
    readonly labId: string;
    readonly lane: SchedulerLane;
    readonly workerId: string;
    readonly leaseDurationMs: number;
    readonly now?: Date;
}

export interface StartAttemptInput {
    readonly id: string;
    readonly taskId: string;
    readonly workerId: string;
    readonly command?: string;
    readonly cwd?: string;
    readonly inputs?: Readonly<Record<string, unknown>>;
    readonly environment?: Readonly<Record<string, string>>;
    readonly reconciliationKey?: string;
    readonly externalEffect?: ExternalEffectValue;
    readonly now?: Date;
}

export interface FinishAttemptInput {
    readonly attemptId: string;
    readonly taskId: string;
    readonly workerId: string;
    readonly status: FinishedAttemptStatus;
    readonly exitCode?: number;
    readonly stdoutPath?: string;
    readonly stderrPath?: string;
    readonly outputHash?: string;
    readonly error?: string;
    readonly retryAt?: Date;
    readonly now?: Date;
}
