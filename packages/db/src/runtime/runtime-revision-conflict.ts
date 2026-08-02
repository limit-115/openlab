export class RuntimeRevisionConflictError extends Error {
    readonly labId: string;
    readonly expectedRevision: number;

    constructor(labId: string, expectedRevision: number) {
        super(`Lab ${labId} is no longer at runtime revision ${expectedRevision}`);
        this.name = "RuntimeRevisionConflictError";
        this.labId = labId;
        this.expectedRevision = expectedRevision;
    }
}
