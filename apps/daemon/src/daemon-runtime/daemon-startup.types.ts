import type { FastifyInstance } from "fastify";
import type { DaemonDatabase } from "#src/daemon-runtime/daemon-database";
import type { ReportDaemonStartup } from "#src/daemon-runtime/daemon-startup-progress.types";
import type { InvestigationRegistry } from "#src/investigation-registry/investigation-registry";
import type { ResearchLoopRunner } from "#src/investigation-registry/investigation-registry.types";
import type { ReleaseOnThisMachine } from "#src/investigation-status/status-server.types";
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
    /** How the caller is told what the lab has got through, so a terminal can show it happening. */
    reportStartup?: ReportDaemonStartup;
    /** How a configured channel is opened, so a test can watch the lab report without a vendor. */
    openNotificationChannel?: OpenNotificationChannel;
    /** How the operator's chat is read, so a test can speak as them without a vendor. */
    openOperatorConversation?: OperatorAnswersOptions["openConversation"];
    /** What is installed here and what the channel had. Without it the lab says it knows nothing. */
    release?: ReleaseOnThisMachine;
}
