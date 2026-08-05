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
    /**
     * Whether the lab is held up until somebody answers this. It is a fact about the moment rather
     * than about any channel, so a channel that cannot carry an answer back reads the same message
     * and simply says it; one that can offers to take the answer where it is read.
     */
    readonly awaitsAnswer?: boolean;
}

/**
 * What a delivery became at the vendor, so far as anything can be said back to it later. A message
 * nobody can reply to leaves this empty, which is every channel that only writes.
 */
export interface DeliveredNotification {
    /** What a reply to this message quotes, in whatever way that vendor names its messages. */
    readonly reference?: string;
}

/**
 * Something the operator said back through a channel that carries both ways. The lab reads no
 * meaning into the words: they are carried to the agent that asked, exactly as they were written.
 */
export interface OperatorReply {
    readonly text: string;
    /** The message it was written as a reply to, where it was written as a reply to one. */
    readonly answers?: string;
    /** When the vendor says it was sent, so a backlog is never mistaken for an answer to now. */
    readonly sentAt: Date;
}
