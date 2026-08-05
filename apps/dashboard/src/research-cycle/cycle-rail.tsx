import type { AgentRun } from "@openlab/protocol/agent-runs/agent-run.types";
import { useTranslation } from "react-i18next";
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
import type { StageCounts } from "#src/research-cycle/cycle-stage.types";
import { RESEARCH_CYCLE_NAMESPACE } from "#src/research-cycle/research-cycle.i18n";

interface CycleRailProps {
    runs: AgentRun[];
}

/**
 * Where the current cycle stands, read left to right. Counting records says how much there is; this
 * says what the investigation is doing with it.
 */
export function CycleRail({ runs }: CycleRailProps) {
    const { t } = useTranslation(RESEARCH_CYCLE_NAMESPACE);

    /** A stage nobody reached says so; every other one lists what its agents are doing. */
    function note({ running, blocked, succeeded, ended }: StageCounts): string {
        const parts = [
            running > 0 ? t("working", { count: running }) : undefined,
            blocked > 0 ? t("blocked", { count: blocked }) : undefined,
            succeeded > 0 ? t("finished", { count: succeeded }) : undefined,
            ended > 0 ? t("stopped", { count: ended }) : undefined
        ].filter((part) => part !== undefined);

        return parts.length === 0 ? t("notReached") : parts.join(" · ");
    }

    return (
        <ol className={CYCLE_RAIL} aria-label={t("title")}>
            {cycleStages(runs).map((stage) => (
                <li key={stage.role} className={cn(CYCLE_STAGE, CYCLE_STAGE_SURFACE[stage.state])}>
                    <span className={cn(CYCLE_STAGE_NAME, CYCLE_STAGE_NAME_TONE[stage.state])}>
                        {t(stage.role)}
                    </span>
                    <span className={cn(CYCLE_STAGE_NOTE, CYCLE_STAGE_NOTE_TONE[stage.state])}>
                        {note(stage.counts)}
                    </span>
                </li>
            ))}
        </ol>
    );
}
