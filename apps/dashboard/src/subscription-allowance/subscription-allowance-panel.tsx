import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance,
    SubscriptionAllowanceRoster
} from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { allowanceWindowLabel } from "#src/subscription-allowance/allowance-window-label";
import {
    ALLOWANCE_CARD,
    ALLOWANCE_CARD_HEADER,
    ALLOWANCE_CARD_SPENT,
    ALLOWANCE_ERROR,
    ALLOWANCE_LIST,
    ALLOWANCE_LIST_LABEL,
    ALLOWANCE_METER,
    ALLOWANCE_METER_SPENT,
    ALLOWANCE_SUBSCRIPTION_NAME,
    ALLOWANCE_WINDOW,
    ALLOWANCE_WINDOW_HEADER,
    ALLOWANCE_WINDOW_LIST,
    ALLOWANCE_WINDOW_RESET,
    HARNESS_SUBSCRIPTION_LABEL
} from "#src/subscription-allowance/subscription-allowance-panel.const";
import { formatDate } from "#src/value-display/timestamp-display";

const SPENT_PERCENT = 100;

interface SubscriptionAllowancePanelProps {
    allowances: SubscriptionAllowanceRoster;
}

/**
 * What every subscription the lab can run on has left. The whole address is the subscriptions, so
 * the list is the page rather than the contents of a card that would only repeat the header.
 */
export function SubscriptionAllowancePanel({ allowances }: SubscriptionAllowancePanelProps) {
    return (
        <ul className={ALLOWANCE_LIST} aria-label={ALLOWANCE_LIST_LABEL}>
            {allowances.map((allowance) => (
                <li
                    key={allowance.harness}
                    className={cn(
                        ALLOWANCE_CARD,
                        allowance.state === SubscriptionAllowanceState.EXHAUSTED &&
                            ALLOWANCE_CARD_SPENT
                    )}
                >
                    <SubscriptionHeader allowance={allowance} />
                    {allowance.state === SubscriptionAllowanceState.UNREADABLE ? (
                        <p className={ALLOWANCE_ERROR}>{allowance.error}</p>
                    ) : (
                        <ul className={ALLOWANCE_WINDOW_LIST}>
                            {allowance.windows.map((window) => (
                                <li key={window.duration_minutes} className={ALLOWANCE_WINDOW}>
                                    <WindowMeter window={window} />
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
}

function SubscriptionHeader({ allowance }: { allowance: SubscriptionAllowance }) {
    return (
        <div className={ALLOWANCE_CARD_HEADER}>
            <span className={ALLOWANCE_SUBSCRIPTION_NAME}>
                {HARNESS_SUBSCRIPTION_LABEL[allowance.harness]}
            </span>
            {allowance.plan === null ? null : <Badge variant="outline">{allowance.plan}</Badge>}
            {allowance.state === SubscriptionAllowanceState.EXHAUSTED ? (
                <Badge variant="destructive">No allowance left</Badge>
            ) : null}
        </div>
    );
}

function WindowMeter({ window }: { window: AllowanceWindow }) {
    const label = allowanceWindowLabel(window.duration_minutes);

    return (
        <>
            <div className={ALLOWANCE_WINDOW_HEADER}>
                <span>
                    {label} · {Math.round(window.used_percent)}% used
                </span>
                {window.resets_at === null ? null : (
                    <span className={ALLOWANCE_WINDOW_RESET}>
                        resets {formatDate(window.resets_at)}
                    </span>
                )}
            </div>
            <progress
                className={cn(
                    ALLOWANCE_METER,
                    window.used_percent >= SPENT_PERCENT && ALLOWANCE_METER_SPENT
                )}
                value={Math.min(window.used_percent, SPENT_PERCENT)}
                max={SPENT_PERCENT}
                aria-label={`${label} window`}
            />
        </>
    );
}
