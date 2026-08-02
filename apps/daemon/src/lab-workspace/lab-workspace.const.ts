export const WorkspaceMutationAction = {
    COMMIT: "commit",
    SKIP: "skip"
} as const;
export type WorkspaceMutationAction =
    (typeof WorkspaceMutationAction)[keyof typeof WorkspaceMutationAction];

export const WorkspaceRecoveryLimit = {
    MAX_RECORDS: 1_000
} as const;
