import type { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";

export interface ResearchWorkspace {
    readonly id: string;
    readonly stage: ResearchStage;
    readonly cwd: string;
    readonly artifactDirectory: string;
}

export interface ResearchWorkspaceFactory {
    create(stage: ResearchStage, ordinal: number): Promise<ResearchWorkspace>;
}
