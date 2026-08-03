import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import { cn } from "#src/design-system/class-names";
import {
    CYCLE_RAIL,
    CYCLE_STAGE,
    CYCLE_STAGE_NAME,
    CYCLE_STAGE_NAME_TONE,
    CYCLE_STAGE_NOTE,
    CYCLE_STAGE_NOTE_TONE,
    CYCLE_STAGE_SURFACE
} from "#src/research-cycle/cycle-rail.const";
import { cycleStages } from "#src/research-cycle/cycle-stage";

interface CycleRailProps {
    agents: AgentSummary[];
}

/**
 * Where the current cycle stands, read left to right. It replaces counting branches and tasks,
 * which said how much there is without ever saying what the lab is doing with it.
 */
export function CycleRail({ agents }: CycleRailProps) {
    return (
        <ol className={CYCLE_RAIL} aria-label="Research cycle">
            {cycleStages(agents).map((stage) => (
                <li key={stage.role} className={cn(CYCLE_STAGE, CYCLE_STAGE_SURFACE[stage.state])}>
                    <span className={cn(CYCLE_STAGE_NAME, CYCLE_STAGE_NAME_TONE[stage.state])}>
                        {stage.label}
                    </span>
                    <span className={cn(CYCLE_STAGE_NOTE, CYCLE_STAGE_NOTE_TONE[stage.state])}>
                        {stage.note}
                    </span>
                </li>
            ))}
        </ol>
    );
}
