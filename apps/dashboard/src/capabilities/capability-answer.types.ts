export interface CapabilityAnswer {
    investigationId: string;
    id: string;
    /** The operator's own prose, carried to the daemon exactly as they typed it. */
    answer: string;
}
