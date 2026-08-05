import {
    type HarnessEffortLevel,
    HarnessEffortLevels,
    type HarnessKind,
    HarnessKinds
} from "@nightlab/harness/agent-harness.const";
import {
    type AgentEffortLevel,
    AgentEffortLevel as AgentEffortLevels,
    type AgentHarnessKind,
    AgentHarnessKind as AgentHarnessKinds
} from "@nightlab/protocol/agents/agent-execution.const";

/**
 * The harness package owns its own finite domains and never depends on the wire protocol, so a
 * harness session is translated into snapshot state through explicit tables.
 */
export const SnapshotHarnessKind: Record<HarnessKind, AgentHarnessKind> = {
    [HarnessKinds.CODEX]: AgentHarnessKinds.CODEX,
    [HarnessKinds.CLAUDE]: AgentHarnessKinds.CLAUDE,
    [HarnessKinds.GLM]: AgentHarnessKinds.GLM
};

export const SnapshotEffortLevel: Record<HarnessEffortLevel, AgentEffortLevel> = {
    [HarnessEffortLevels.LOW]: AgentEffortLevels.LOW,
    [HarnessEffortLevels.MEDIUM]: AgentEffortLevels.MEDIUM,
    [HarnessEffortLevels.HIGH]: AgentEffortLevels.HIGH,
    [HarnessEffortLevels.XHIGH]: AgentEffortLevels.XHIGH,
    [HarnessEffortLevels.MAX]: AgentEffortLevels.MAX
};
