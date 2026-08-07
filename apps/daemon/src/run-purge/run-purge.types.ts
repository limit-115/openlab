export interface PurgeRunsInput {
    readonly workspaceRoot: string;
    /** Where the agent CLIs keep their own histories, read the same way they read it themselves. */
    readonly environment: Readonly<NodeJS.ProcessEnv>;
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
    /** CLI session stores holding their own account of this lab's runs, which a purge leaves alone. */
    readonly retainedCliHistory: readonly string[];
}
