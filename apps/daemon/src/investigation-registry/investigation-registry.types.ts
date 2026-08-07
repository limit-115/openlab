import type { InvestigationRepository } from "@openlab/db/investigations/investigation-repository";
import type { RuntimePersistence } from "@openlab/db/runtime/runtime-persistence";
import type { InvestigationSummary } from "@openlab/protocol/investigation-status/investigation-summary.types";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { ResearchLoopController } from "#src/daemon-runtime/research-loop-controller";
import type { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type { LabSettingsReader } from "#src/lab-settings/lab-settings.types";
import type {
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";

export type RegistryPersistence = Pick<
    RuntimePersistence,
    "initialize" | "load" | "commit" | "eventsAfter" | "listPersisted" | "retask"
>;

export type InvestigationRecords = Pick<InvestigationRepository, "delete">;

export type ResearchLoopRunner = (
    workspace: InvestigationWorkspace,
    options: ResearchLoopOptions
) => Promise<ResearchLoopOutcome>;

export type RegistryListener = (roster: readonly InvestigationSummary[]) => void;

/** One investigation the lab is holding: its record, its live agents and its research loop. */
export interface HeldInvestigation {
    readonly workspace: InvestigationWorkspace;
    readonly activity: AgentActivityHub;
    readonly controller: ResearchLoopController;
}

export interface InvestigationRegistryOptions {
    readonly workspaceRoot: string;
    readonly persistence: RegistryPersistence;
    readonly investigations: InvestigationRecords;
    readonly allowances?: HarnessAllowanceReadings;
    /** Absent starts every investigation on the shipped roster and every role on its default. */
    readonly settings?: LabSettingsReader;
    readonly researchLoop?: ResearchLoopRunner;
}
