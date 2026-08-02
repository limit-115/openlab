import {
    type HarnessEffortLevel,
    HarnessEffortLevels,
    type HarnessKind,
    HarnessKinds
} from "@lab/harness/agent-harness.const";
import {
    type AgentEffortLevel,
    AgentEffortLevel as AgentEffortLevels,
    type AgentHarnessKind,
    AgentHarnessKind as AgentHarnessKinds
} from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";

/**
 * The harness package owns its own finite domains and never depends on the wire protocol, so a
 * harness session is translated into snapshot state through explicit tables.
 */
export const SnapshotHarnessKind: Record<HarnessKind, AgentHarnessKind> = {
    [HarnessKinds.CODEX]: AgentHarnessKinds.CODEX,
    [HarnessKinds.CLAUDE]: AgentHarnessKinds.CLAUDE,
    [HarnessKinds.GLM]: AgentHarnessKinds.GLM
};

/**
 * Which role a stage's agent is reported under. The two domains list the same work, but one belongs
 * to the research loop and the other to the wire protocol, so neither is read as the other.
 */
export const SnapshotAgentRole: Record<ResearchStage, AgentRole> = {
    [ResearchStage.DIRECTOR]: AgentRole.DIRECTOR,
    [ResearchStage.RESEARCHER]: AgentRole.RESEARCHER,
    [ResearchStage.CRITIC]: AgentRole.CRITIC,
    [ResearchStage.VERIFIER]: AgentRole.VERIFIER
};

export const SnapshotEffortLevel: Record<HarnessEffortLevel, AgentEffortLevel> = {
    [HarnessEffortLevels.LOW]: AgentEffortLevels.LOW,
    [HarnessEffortLevels.MEDIUM]: AgentEffortLevels.MEDIUM,
    [HarnessEffortLevels.HIGH]: AgentEffortLevels.HIGH,
    [HarnessEffortLevels.XHIGH]: AgentEffortLevels.XHIGH,
    [HarnessEffortLevels.MAX]: AgentEffortLevels.MAX
};
