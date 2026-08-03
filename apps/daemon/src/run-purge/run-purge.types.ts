import type { PurgeScope } from "#src/run-purge/run-purge.const";

export interface PurgeRunsInput {
    readonly workspaceRoot: string;
    readonly databaseUrl: string;
    readonly scope: PurgeScope;
}

export interface PurgeDirectoriesInput {
    readonly workspaceRoot: string;
    readonly keptLabId: string | undefined;
}

export interface PurgePlanInput {
    readonly workspaceRoot: string;
    readonly databaseUrl: string;
}

export interface PurgePlan {
    readonly labIds: readonly string[];
    readonly currentLabId: string | undefined;
}

export interface PurgeResult {
    readonly purgedLabIds: readonly string[];
    readonly keptLabId: string | undefined;
    readonly purgedDirectoryCount: number;
    readonly purgedLabRowCount: number;
}
