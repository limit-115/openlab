import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import type { Finding } from "@lab/protocol/findings/finding.types";
import type { Verdict } from "@lab/protocol/verdicts/verdict.types";
import { AssumptionCard } from "#src/assumptions/assumption-card";
import { ASSUMPTION_LIST } from "#src/assumptions/assumption-card.const";
import { cn } from "#src/design-system/class-names";
import { Panel } from "#src/panel/panel";
import { PANEL_SCROLLER } from "#src/panel/panel.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface AssumptionsPanelProps {
    assumptions: Assumption[];
    findings: Finding[];
    verdicts: Verdict[];
}

export function AssumptionsPanel({ assumptions, findings, verdicts }: AssumptionsPanelProps) {
    return (
        <Panel title="Bets" description="Where the director thinks the goal might be reachable">
            {assumptions.length === 0 ? (
                <PanelEmptyState
                    title="No bets placed yet"
                    description="The director is still working out where this goal might be reachable."
                />
            ) : (
                <ul className={cn(ASSUMPTION_LIST, PANEL_SCROLLER)}>
                    {[...assumptions]
                        .sort((left, right) => right.cycle - left.cycle)
                        .map((assumption) => (
                            <AssumptionCard
                                key={assumption.id}
                                assumption={assumption}
                                findings={findings.filter(
                                    ({ assumption_id }) => assumption_id === assumption.id
                                )}
                                verdicts={verdicts}
                            />
                        ))}
                </ul>
            )}
        </Panel>
    );
}
