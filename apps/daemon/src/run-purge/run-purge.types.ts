import type { PurgeScope } from "#src/run-purge/run-purge.const";

export interface PurgeRunsInput {
    readonly workspaceRoot: string;
    readonly databaseUrl: string;
    readonly scope: PurgeScope;
}

export interface PurgeDirectoriesInput {
    readonly workspaceRoot: string;
    readonly keptInvestigationId: string | undefined;
}

export interface PurgePlanInput {
    readonly workspaceRoot: string;
    readonly databaseUrl: string;
}

export interface PurgePlan {
    readonly investigationIds: readonly string[];
    readonly currentInvestigationId: string | undefined;
}

export interface PurgeResult {
    readonly purgedInvestigationIds: readonly string[];
    readonly keptInvestigationId: string | undefined;
    readonly purgedDirectoryCount: number;
    readonly purgedInvestigationRowCount: number;
}
