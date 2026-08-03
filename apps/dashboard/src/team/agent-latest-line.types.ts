export interface AgentLatestLine {
    /** What the agent is doing: the tool it called, or the phase it is in. */
    verb: string;
    /** What the tool was called on, shown whole or not at all. */
    detail: string | null;
}
