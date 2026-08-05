import { InvestigationState } from "@nightlab/protocol/investigation-lifecycle/investigation-state.const";
import type { InvestigationSummary } from "@nightlab/protocol/investigation-status/investigation-summary.types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { investigationAddress } from "#src/dashboard-routes/dashboard-routes.const";
import { Button } from "#src/design-system/button";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/investigation-header/elapsed-time";
import {
    CARD,
    CARD_FOOTER,
    CARD_GOAL,
    CARD_HEADER,
    CARD_READING_LABEL,
    CARD_READINGS,
    CARD_STATE
} from "#src/investigation-roster/investigation-roster.const";
import { INVESTIGATION_ROSTER_NAMESPACE } from "#src/investigation-roster/investigation-roster.i18n";
import { INVESTIGATION_STATE_NAMESPACE } from "#src/investigation-state/investigation-state.i18n";
import {
    STATE_DOT,
    STATE_DOT_TONE
} from "#src/investigation-state/investigation-state-display.const";
import { formatDuration } from "#src/value-display/duration-display";

interface InvestigationCardProps {
    investigation: InvestigationSummary;
    discard: () => void;
    discarding: boolean;
}

/**
 * One direction the lab is working on. The goal is the link, because it is what an operator is
 * looking for; everything else on the card answers whether it is worth opening right now.
 */
export function InvestigationCard({ investigation, discard, discarding }: InvestigationCardProps) {
    const { t } = useTranslation(INVESTIGATION_ROSTER_NAMESPACE);
    const { t: state } = useTranslation(INVESTIGATION_STATE_NAMESPACE);
    const uptime = useElapsedTime(
        investigation.uptime_ms,
        investigation.updated_at,
        investigation.state === InvestigationState.RUNNING
    );

    return (
        <article className={CARD}>
            <header className={CARD_HEADER}>
                <Link className={CARD_GOAL} to={investigationAddress(investigation.id)}>
                    {investigation.goal}
                </Link>
                <span className={CARD_STATE}>
                    <span
                        className={cn(STATE_DOT, STATE_DOT_TONE[investigation.state])}
                        aria-hidden="true"
                    />
                    {state(investigation.state)}
                </span>
            </header>

            <dl className={CARD_READINGS}>
                <Reading label={t("bets")} value={String(investigation.assumption_count)} />
                <Reading
                    label={t("findings")}
                    value={t("ofTotal", {
                        done: investigation.confirmed_finding_count,
                        total: investigation.finding_count
                    })}
                />
                <Reading label={t("agents")} value={String(investigation.active_run_count)} />
                {investigation.open_capability_count > 0 ? (
                    <Reading
                        label={t("blocked")}
                        value={String(investigation.open_capability_count)}
                    />
                ) : null}
            </dl>

            <footer className={CARD_FOOTER}>
                <span>
                    {investigation.id} · {formatDuration(uptime)} · {t("harnesses")}:{" "}
                    {investigation.harness_kinds.map((kind) => HARNESS_NAME[kind]).join(", ")}
                </span>
                <Button variant="ghost" size="sm" onClick={discard} disabled={discarding}>
                    {t("discard")}
                </Button>
            </footer>
        </article>
    );
}

function Reading({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <dt className={CARD_READING_LABEL}>{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}
