export class RuntimeRevisionConflictError extends Error {
    readonly investigationId: string;
    readonly expectedRevision: number;

    constructor(investigationId: string, expectedRevision: number) {
        super(
            `Investigation ${investigationId} is no longer at runtime revision ${expectedRevision}`
        );
        this.name = "RuntimeRevisionConflictError";
        this.investigationId = investigationId;
        this.expectedRevision = expectedRevision;
    }
}
