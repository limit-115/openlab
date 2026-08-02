export const BranchStatus = {
    ACTIVE: "active",
    PAUSED: "paused",
    CLOSED: "closed"
} as const;
export type BranchStatus = (typeof BranchStatus)[keyof typeof BranchStatus];
