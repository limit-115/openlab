import type { Finding } from "@openlab/protocol/findings/finding.types";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import type { Verdict } from "@openlab/protocol/verdicts/verdict.types";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import { LeadCard } from "#src/leads/lead-card";
import { LEAD_LIST } from "#src/leads/lead-card.const";
import { LEADS_NAMESPACE } from "#src/leads/leads.i18n";
import { Panel } from "#src/panel/panel";
import { PANEL_SCROLLER } from "#src/panel/panel.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

interface LeadsPanelProps {
    leads: Lead[];
    findings: Finding[];
    verdicts: Verdict[];
}

export function LeadsPanel({ leads, findings, verdicts }: LeadsPanelProps) {
    const { t } = useTranslation(LEADS_NAMESPACE);

    return (
        <Panel title={t("title")} description={t("description")}>
            {leads.length === 0 ? (
                <PanelEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
            ) : (
                <ul className={cn(LEAD_LIST, PANEL_SCROLLER)}>
                    {[...leads]
                        .sort((left, right) => right.cycle - left.cycle)
                        .map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                findings={findings.filter(({ lead_id }) => lead_id === lead.id)}
                                verdicts={verdicts}
                            />
                        ))}
                </ul>
            )}
        </Panel>
    );
}
