import type { FastifyInstance } from "fastify";
import type { DaemonDatabase } from "#src/daemon-runtime/daemon-database";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { ResearchLoopRunner } from "#src/investigation-registry/investigation-registry.types";

export interface RunningDaemon {
    app: FastifyInstance;
    registry: InvestigationRegistry;
    url: string;
    close(): Promise<void>;
}

export interface DaemonDependencies {
    researchLoop?: ResearchLoopRunner;
    openDatabase?: (databaseUrl: string) => Promise<DaemonDatabase>;
}
