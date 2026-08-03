import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { allowanceWindowLabel } from "#src/subscription-allowance/allowance-window-label";
import {
    fetchSubscriptionAllowance,
    subscriptionAllowanceQueryKey
} from "#src/subscription-allowance/subscription-allowance-client";
import {
    ALLOWANCE_ENTRY,
    ALLOWANCE_ENTRY_HEADER,
    ALLOWANCE_ERROR,
    ALLOWANCE_LIST,
    ALLOWANCE_METER,
    ALLOWANCE_METER_SPENT,
    ALLOWANCE_PANEL,
    ALLOWANCE_PANEL_HEADING,
    ALLOWANCE_PANEL_TITLE,
    ALLOWANCE_REFETCH_MILLISECONDS,
    ALLOWANCE_SUBSCRIPTION_NAME,
    ALLOWANCE_WINDOW,
    ALLOWANCE_WINDOW_HEADER,
    ALLOWANCE_WINDOW_LIST,
    ALLOWANCE_WINDOW_RESET,
    HARNESS_SUBSCRIPTION_LABEL
} from "#src/subscription-allowance/subscription-allowance-panel.const";
import { formatDate } from "#src/value-display/timestamp-display";

/**
 * What each subscription has left before the lab has to wait for it. Nothing is drawn until the
 * runtime answers: a lab whose daemon does not serve the readings is one that dispatches blind, and
 * an empty panel would claim otherwise.
 */
export function SubscriptionAllowancePanel() {
    const allowances = useQuery({
        queryKey: subscriptionAllowanceQueryKey,
        queryFn: ({ signal }) => fetchSubscriptionAllowance(signal),
        retry: false,
        staleTime: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchInterval: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchOnWindowFocus: true
    });

    if (allowances.data === undefined || allowances.data.length === 0) {
        return null;
    }

    return (
        <section className={ALLOWANCE_PANEL} aria-label={ALLOWANCE_PANEL_TITLE}>
            <h2 className={ALLOWANCE_PANEL_HEADING}>{ALLOWANCE_PANEL_TITLE}</h2>
            <ul className={ALLOWANCE_LIST}>
                {allowances.data.map((allowance) => (
                    <li key={allowance.harness} className={ALLOWANCE_ENTRY}>
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
        </section>
    );
}

function SubscriptionHeader({ allowance }: { allowance: SubscriptionAllowance }) {
    return (
        <div className={ALLOWANCE_ENTRY_HEADER}>
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
    const spent = window.used_percent >= 100;
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
                className={cn(ALLOWANCE_METER, spent && ALLOWANCE_METER_SPENT)}
                value={Math.min(window.used_percent, 100)}
                max={100}
                aria-label={`${label} window`}
            />
        </>
    );
}
