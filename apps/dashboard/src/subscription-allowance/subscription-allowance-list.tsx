import type { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { windowSpendCap, withheldWindows } from "@lab/protocol/spend-caps/spend-cap";
import type { SpendCaps } from "@lab/protocol/spend-caps/spend-cap.types";
import { SubscriptionAllowanceState } from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type {
    SubscriptionAllowance,
    SubscriptionAllowanceRoster
} from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { subscriptionPlanName } from "#src/agent-harness/subscription-plan-name";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { allowanceWindowName } from "#src/subscription-allowance/allowance-window-label";
import { SpendCapMeter } from "#src/subscription-allowance/spend-cap-meter";
import { SUBSCRIPTION_ALLOWANCE_NAMESPACE } from "#src/subscription-allowance/subscription-allowance.i18n";
import {
    ALLOWANCE_CARD,
    ALLOWANCE_CARD_HEADER,
    ALLOWANCE_CARD_SPENT,
    ALLOWANCE_ERROR,
    ALLOWANCE_LIST,
    ALLOWANCE_PLAN_NAME,
    ALLOWANCE_SUBSCRIPTION_NAME,
    ALLOWANCE_WINDOW,
    ALLOWANCE_WINDOW_LIST
} from "#src/subscription-allowance/subscription-allowance-list.const";

interface SubscriptionAllowanceListProps {
    allowances: SubscriptionAllowanceRoster;
    /** Where the limiters stand on the page, which is where the operator has dragged them. */
    caps: SpendCaps;
    /** The caps the lab has actually been given, which decide what it is doing right now. */
    heldBy: SpendCaps;
    /** Absent where the runtime serves no settings: the caps are then not the page's to move. */
    setCap?: (harness: AgentHarnessKind, windowMinutes: number, percent: number) => void;
}

/**
 * One card per subscription: what each of its windows has left, and the point the lab stops
 * spending it. The readings are drawn as a plain list under the block's heading rather than boxed
 * in a card that would repeat it.
 */
export function SubscriptionAllowanceList({
    allowances,
    caps,
    heldBy,
    setCap
}: SubscriptionAllowanceListProps) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);
    const windowLabel = (durationMinutes: number): string => {
        const name = allowanceWindowName(durationMinutes);
        return "count" in name ? t(name.key, { count: name.count }) : t(name.key);
    };

    return (
        <ul className={ALLOWANCE_LIST} aria-label={t("title")}>
            {allowances.map((allowance) => {
                const held = withheldWindows(allowance, heldBy);
                return (
                    <li
                        key={allowance.harness}
                        className={cn(
                            ALLOWANCE_CARD,
                            (allowance.state === SubscriptionAllowanceState.EXHAUSTED ||
                                held.length > 0) &&
                                ALLOWANCE_CARD_SPENT
                        )}
                    >
                        <SubscriptionHeader allowance={allowance} withheld={held.length > 0} />
                        {allowance.state === SubscriptionAllowanceState.UNREADABLE ? (
                            <p className={ALLOWANCE_ERROR}>{allowance.error}</p>
                        ) : (
                            <ul className={ALLOWANCE_WINDOW_LIST}>
                                {allowance.windows.map((window) => (
                                    <li key={window.duration_minutes} className={ALLOWANCE_WINDOW}>
                                        <SpendCapMeter
                                            window={window}
                                            label={windowLabel(window.duration_minutes)}
                                            cap={windowSpendCap(
                                                caps,
                                                allowance.harness,
                                                window.duration_minutes
                                            )}
                                            withheld={held.includes(window)}
                                            {...(setCap === undefined
                                                ? {}
                                                : {
                                                      setCap: (percent: number) =>
                                                          setCap(
                                                              allowance.harness,
                                                              window.duration_minutes,
                                                              percent
                                                          )
                                                  })}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function SubscriptionHeader({
    allowance,
    withheld
}: {
    allowance: SubscriptionAllowance;
    withheld: boolean;
}) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);

    return (
        <div className={ALLOWANCE_CARD_HEADER}>
            <span className={ALLOWANCE_SUBSCRIPTION_NAME}>{HARNESS_NAME[allowance.harness]}</span>
            {allowance.plan === null ? null : (
                <Badge variant="outline" className={ALLOWANCE_PLAN_NAME}>
                    {subscriptionPlanName(allowance.plan)}
                </Badge>
            )}
            {allowance.state === SubscriptionAllowanceState.EXHAUSTED ? (
                <Badge variant="destructive">{t("exhausted")}</Badge>
            ) : null}
            {withheld ? <Badge variant="secondary">{t("withheld")}</Badge> : null}
        </div>
    );
}
