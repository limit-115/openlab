import type { Assumption } from "@nightlab/protocol/assumptions/assumption.types";
import type { Finding } from "@nightlab/protocol/findings/finding.types";
import type { Verdict } from "@nightlab/protocol/verdicts/verdict.types";
import { useTranslation } from "react-i18next";
import { AssumptionCard } from "#src/assumptions/assumption-card";
import { ASSUMPTION_LIST } from "#src/assumptions/assumption-card.const";
import { ASSUMPTIONS_NAMESPACE } from "#src/assumptions/assumptions.i18n";
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
    const { t } = useTranslation(ASSUMPTIONS_NAMESPACE);

    return (
        <Panel title={t("title")} description={t("description")}>
            {assumptions.length === 0 ? (
                <PanelEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
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
