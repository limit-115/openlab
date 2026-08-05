import type { FastifyInstance } from "fastify";
import type { DaemonDatabase } from "#src/daemon-runtime/daemon-database";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { ResearchLoopRunner } from "#src/investigation-registry/investigation-registry.types";
import type { OperatorAnswersOptions } from "#src/operator-answers/operator-answers.types";
import type { OpenNotificationChannel } from "#src/operator-notifications/operator-notifications.types";

export interface RunningDaemon {
    app: FastifyInstance;
    registry: InvestigationRegistry;
    url: string;
    close(): Promise<void>;
}

export interface DaemonDependencies {
    researchLoop?: ResearchLoopRunner;
    openDatabase?: (databasePath: string) => Promise<DaemonDatabase>;
    /** How a configured channel is opened, so a test can watch the lab report without a vendor. */
    openNotificationChannel?: OpenNotificationChannel;
    /** How the operator's chat is read, so a test can speak as them without a vendor. */
    openOperatorConversation?: OperatorAnswersOptions["openConversation"];
}
