export interface EventPayloadDisplay {
    /** A readable one-line lead, when the payload carries one. */
    readonly headline?: string;
    /** The complete payload, formatted for reading. Never abbreviated. */
    readonly detail?: string;
}
