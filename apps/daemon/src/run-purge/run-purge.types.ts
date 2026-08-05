export interface PurgeRunsInput {
    readonly workspaceRoot: string;
}

export interface PurgeDirectoriesInput {
    readonly workspaceRoot: string;
}

export interface PurgePlanInput {
    readonly workspaceRoot: string;
}

export interface PurgePlan {
    readonly investigationIds: readonly string[];
}

export interface PurgeResult {
    readonly purgedInvestigationIds: readonly string[];
    readonly purgedDirectoryCount: number;
    readonly purgedInvestigationRowCount: number;
}
