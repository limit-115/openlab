/**
 * A persisted checkpoint that no longer satisfies the current protocol schema. The run it describes
 * cannot be resumed, but the record itself is left untouched: rewriting it would invent state the
 * lab never produced.
 */
export class IncompatibleCheckpointError extends Error {
    readonly labId: string;

    constructor(labId: string, options?: ErrorOptions) {
        super(
            `Runtime checkpoint for ${labId} predates the current protocol schema and cannot be resumed`,
            options
        );
        this.name = "IncompatibleCheckpointError";
        this.labId = labId;
    }
}
