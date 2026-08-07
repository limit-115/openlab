export const WorkspaceLayout = {
    RUNS_DIRECTORY: "runs"
} as const;

/** The files a run directory carries for whoever reads it after the fact. */
export const WorkspaceFile = {
    INPUT: "investigation.json",
    STATUS: "status.json",
    EVENTS: "events.json",
    LEADS: "leads.json",
    RESULT: "result.json",
    REPORT: "report.md"
} as const;

export const WorkspaceMutationAction = {
    COMMIT: "commit",
    SKIP: "skip"
} as const;
export type WorkspaceMutationAction =
    (typeof WorkspaceMutationAction)[keyof typeof WorkspaceMutationAction];
