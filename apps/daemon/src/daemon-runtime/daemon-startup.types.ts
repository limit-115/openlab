import type { FastifyInstance } from "fastify";
import type { DaemonDatabase } from "#src/daemon-runtime/daemon-database";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";

export interface RunningDaemon {
    app: FastifyInstance;
    workspace: LabWorkspace;
    url: string;
    close(): Promise<void>;
}

export interface DaemonDependencies {
    researchLoop?: (
        workspace: LabWorkspace,
        options: ResearchLoopOptions
    ) => Promise<ResearchLoopOutcome>;
    openDatabase?: (databaseUrl: string) => Promise<DaemonDatabase>;
}
