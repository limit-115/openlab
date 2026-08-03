import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";

export function parseTimestamp(value: string, field: string): Date {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        throw new Error(`${field} must be a valid timestamp`);
    }
    return timestamp;
}

export function assertRevision(revision: number): void {
    if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new RangeError("Runtime revision must be a positive safe integer");
    }
}

export function assertPageSize(limit: number, maximum: number): void {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
        throw new RangeError(`Page size must be between 1 and ${maximum}`);
    }
}

export function assertNonEmptyWorkspacePath(workspacePath: string): void {
    if (workspacePath.trim().length === 0) {
        throw new Error("Workspace path must not be empty");
    }
}

export function assertNonEmptyIdentifier(value: string, field: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${field} must not be empty`);
    }
}

export function assertRuntimeMetadata(
    labId: string,
    task: TaskInput,
    workspacePath: string,
    snapshot: StatusSnapshot
): void {
    assertNonEmptyWorkspacePath(workspacePath);
    if (snapshot.lab.id !== labId) {
        throw new Error(`Runtime checkpoint lab id does not match lab record ${labId}`);
    }
    if (snapshot.lab.goal !== task.goal) {
        throw new Error(`Runtime checkpoint goal does not match task input for ${labId}`);
    }
}
