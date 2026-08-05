import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { FileTextIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import {
    ARTIFACT_LINK,
    ARTIFACT_LINKS,
    OUTCOME_CARD,
    OUTCOME_LIMITATIONS_HEADING,
    OUTCOME_LIMITATIONS_LIST,
    OUTCOME_SUMMARY,
    OUTCOME_SURFACE
} from "#src/investigation-outcome/outcome-panel.const";
import { OUTCOME_PANEL_NAMESPACE } from "#src/investigation-outcome/outcome-panel.i18n";
import { Panel } from "#src/panel/panel";

interface OutcomePanelProps {
    snapshot: StatusSnapshot;
}

export function OutcomePanel({ snapshot }: OutcomePanelProps) {
    const { t } = useTranslation(OUTCOME_PANEL_NAMESPACE);
    const { state, reason } = snapshot.investigation;
    const shouldShow =
        snapshot.result ||
        state === InvestigationState.HIBERNATING ||
        state === InvestigationState.BREAKTHROUGH ||
        state === InvestigationState.FAILED ||
        state === InvestigationState.STOPPED;

    if (!shouldShow) {
        return null;
    }

    return (
        <Panel title={t(state)} description={t("outcome")}>
            <div className={cn(OUTCOME_CARD, OUTCOME_SURFACE[state])}>
                <p className={OUTCOME_SUMMARY}>
                    {snapshot.result?.summary ?? reason ?? t("noReason")}
                </p>
                {snapshot.result?.limitations.length ? (
                    <div className="mt-6">
                        <h3 className={OUTCOME_LIMITATIONS_HEADING}>{t("limitations")}</h3>
                        <ul className={OUTCOME_LIMITATIONS_LIST}>
                            {snapshot.result.limitations.map((limitation) => (
                                <li key={limitation}>{limitation}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {snapshot.result?.report_path || snapshot.result?.result_path ? (
                    <ul className={ARTIFACT_LINKS} aria-label={t("artifacts")}>
                        {snapshot.result.report_path ? (
                            <li className={ARTIFACT_LINK}>
                                <FileTextIcon className="size-4 flex-none" aria-hidden="true" />
                                {snapshot.result.report_path}
                            </li>
                        ) : null}
                        {snapshot.result.result_path ? (
                            <li className={ARTIFACT_LINK}>
                                <FileTextIcon className="size-4 flex-none" aria-hidden="true" />
                                {snapshot.result.result_path}
                            </li>
                        ) : null}
                    </ul>
                ) : null}
            </div>
        </Panel>
    );
}
