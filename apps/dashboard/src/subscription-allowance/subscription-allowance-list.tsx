import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance,
    SubscriptionAllowanceRoster
} from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { useTranslation } from "react-i18next";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { allowanceWindowName } from "#src/subscription-allowance/allowance-window-label";
import { SUBSCRIPTION_ALLOWANCE_NAMESPACE } from "#src/subscription-allowance/subscription-allowance.i18n";
import {
    ALLOWANCE_CARD,
    ALLOWANCE_CARD_HEADER,
    ALLOWANCE_CARD_SPENT,
    ALLOWANCE_ERROR,
    ALLOWANCE_LIST,
    ALLOWANCE_METER,
    ALLOWANCE_METER_SPENT,
    ALLOWANCE_SUBSCRIPTION_NAME,
    ALLOWANCE_WINDOW,
    ALLOWANCE_WINDOW_HEADER,
    ALLOWANCE_WINDOW_LIST,
    ALLOWANCE_WINDOW_RESET,
    HARNESS_SUBSCRIPTION_LABEL
} from "#src/subscription-allowance/subscription-allowance-list.const";
import { formatDate } from "#src/value-display/timestamp-display";

const SPENT_PERCENT = 100;

interface SubscriptionAllowanceListProps {
    allowances: SubscriptionAllowanceRoster;
}

/**
 * One card per subscription, each metering the windows the vendor reports. The readings are drawn
 * as a plain list under the block's heading rather than boxed in a card that would repeat it.
 */
export function SubscriptionAllowanceList({ allowances }: SubscriptionAllowanceListProps) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);

    return (
        <ul className={ALLOWANCE_LIST} aria-label={t("title")}>
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
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);

    return (
        <div className={ALLOWANCE_CARD_HEADER}>
            <span className={ALLOWANCE_SUBSCRIPTION_NAME}>
                {HARNESS_SUBSCRIPTION_LABEL[allowance.harness]}
            </span>
            {allowance.plan === null ? null : <Badge variant="outline">{allowance.plan}</Badge>}
            {allowance.state === SubscriptionAllowanceState.EXHAUSTED ? (
                <Badge variant="destructive">{t("exhausted")}</Badge>
            ) : null}
        </div>
    );
}

function WindowMeter({ window }: { window: AllowanceWindow }) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);
    const name = allowanceWindowName(window.duration_minutes);
    const label = "count" in name ? t(name.key, { count: name.count }) : t(name.key);

    return (
        <>
            <div className={ALLOWANCE_WINDOW_HEADER}>
                <span>
                    {t("used", { window: label, percent: Math.round(window.used_percent) })}
                </span>
                {window.resets_at === null ? null : (
                    <span className={ALLOWANCE_WINDOW_RESET}>
                        {t("resets", { at: formatDate(window.resets_at) })}
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
                aria-label={t("meter", { window: label })}
            />
        </>
    );
}
