import type { FastifyInstance } from "fastify";
import type { DaemonDatabase } from "#src/daemon-runtime/daemon-database";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";

export interface RunningDaemon {
    app: FastifyInstance;
    workspace: InvestigationWorkspace;
    url: string;
    close(): Promise<void>;
}

export interface DaemonDependencies {
    researchLoop?: (
        workspace: InvestigationWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    openDatabase?: (databaseUrl: string) => Promise<DaemonDatabase>;
}
