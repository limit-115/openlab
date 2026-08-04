import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { InvestigationSummary } from "@lab/protocol/investigation-status/investigation-summary.types";
import { Link } from "react-router";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
import { Button } from "#src/design-system/button";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/investigation-header/elapsed-time";
import {
    AGENTS_LABEL,
    BETS_LABEL,
    BLOCKED_LABEL,
    CARD,
    CARD_FOOTER,
    CARD_GOAL,
    CARD_HEADER,
    CARD_READING_LABEL,
    CARD_READINGS,
    CARD_STATE,
    DISCARD_INVESTIGATION_LABEL,
    FINDINGS_LABEL,
    HARNESSES_LABEL
} from "#src/investigation-roster/investigation-roster.const";
import {
    INVESTIGATION_STATE_LABEL,
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
    const uptime = useElapsedTime(
        investigation.uptime_ms,
        investigation.updated_at,
        investigation.state === InvestigationState.RUNNING
    );

    return (
        <article className={CARD}>
            <header className={CARD_HEADER}>
                <Link className={CARD_GOAL} to={investigationView(investigation.id)}>
                    {investigation.goal}
                </Link>
                <span className={CARD_STATE}>
                    <span
                        className={cn(STATE_DOT, STATE_DOT_TONE[investigation.state])}
                        aria-hidden="true"
                    />
                    {INVESTIGATION_STATE_LABEL[investigation.state]}
                </span>
            </header>

            <dl className={CARD_READINGS}>
                <Reading label={BETS_LABEL} value={String(investigation.assumption_count)} />
                <Reading
                    label={FINDINGS_LABEL}
                    value={`${investigation.confirmed_finding_count} of ${investigation.finding_count}`}
                />
                <Reading label={AGENTS_LABEL} value={String(investigation.active_run_count)} />
                {investigation.open_capability_count > 0 ? (
                    <Reading
                        label={BLOCKED_LABEL}
                        value={String(investigation.open_capability_count)}
                    />
                ) : null}
            </dl>

            <footer className={CARD_FOOTER}>
                <span>
                    {investigation.id} · {formatDuration(uptime)} · {HARNESSES_LABEL}:{" "}
                    {investigation.harness_kinds.join(", ")}
                </span>
                <Button variant="ghost" size="sm" onClick={discard} disabled={discarding}>
                    {DISCARD_INVESTIGATION_LABEL}
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
