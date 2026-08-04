/**
 * One reading beside its name. Facts are what an operator scans before deciding whether to open the
 * lab at all, so they are named values rather than a paragraph the vendor has to guess the shape of.
 */
export interface NotificationFact {
    readonly label: string;
    readonly value: string;
}

export interface NotificationLink {
    readonly label: string;
    readonly url: string;
}

/**
 * One thing the lab has to say, before any vendor has decided how to draw it. It is already in the
 * language the operator asked for and already free of markup: a channel chooses the emphasis and
 * the escaping its own service understands, and never the words.
 */
export interface NotificationMessage {
    readonly title: string;
    readonly body: string;
    readonly facts: readonly NotificationFact[];
    /** Where to read the whole story. Absent for a message that is the whole story. */
    readonly link?: NotificationLink;
}
