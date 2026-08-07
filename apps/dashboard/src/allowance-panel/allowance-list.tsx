import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessAllowanceState } from "@openlab/protocol/harness-allowance/harness-allowance.const";
import type {
    HarnessAllowance,
    HarnessAllowanceRoster
} from "@openlab/protocol/harness-allowance/harness-allowance.types";
import { windowSpendCap, withheldWindows } from "@openlab/protocol/spend-caps/spend-cap";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { subscriptionPlanName } from "#src/agent-harness/subscription-plan-name";
import {
    ALLOWANCE_CARD,
    ALLOWANCE_CARD_HEADER,
    ALLOWANCE_CARD_SPENT,
    ALLOWANCE_ERROR,
    ALLOWANCE_HARNESS_NAME,
    ALLOWANCE_LIST,
    ALLOWANCE_PLAN_NAME,
    ALLOWANCE_WINDOW,
    ALLOWANCE_WINDOW_LIST
} from "#src/allowance-panel/allowance-list.const";
import { HARNESS_ALLOWANCE_NAMESPACE } from "#src/allowance-panel/allowance-panel.i18n";
import { allowanceWindowName } from "#src/allowance-panel/allowance-window-label";
import { SpendCapMeter } from "#src/allowance-panel/spend-cap-meter";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";

interface HarnessAllowanceListProps {
    allowances: HarnessAllowanceRoster;
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
export function HarnessAllowanceList({
    allowances,
    caps,
    heldBy,
    setCap
}: HarnessAllowanceListProps) {
    const { t } = useTranslation(HARNESS_ALLOWANCE_NAMESPACE);
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
                            (allowance.state === HarnessAllowanceState.EXHAUSTED ||
                                held.length > 0) &&
                                ALLOWANCE_CARD_SPENT
                        )}
                    >
                        <AllowanceHeader allowance={allowance} withheld={held.length > 0} />
                        {allowance.state === HarnessAllowanceState.UNREADABLE ? (
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

function AllowanceHeader({
    allowance,
    withheld
}: {
    allowance: HarnessAllowance;
    withheld: boolean;
}) {
    const { t } = useTranslation(HARNESS_ALLOWANCE_NAMESPACE);

    return (
        <div className={ALLOWANCE_CARD_HEADER}>
            <span className={ALLOWANCE_HARNESS_NAME}>{HARNESS_NAME[allowance.harness]}</span>
            {allowance.plan === null ? null : (
                <Badge variant="outline" className={ALLOWANCE_PLAN_NAME}>
                    {subscriptionPlanName(allowance.plan)}
                </Badge>
            )}
            {/**
             * A balance is money and stays in the vendor's own spelling: capitalizing it the way a
             * plan tier is capitalized would present a wallet as a plan the operator had bought.
             */}
            {allowance.balance === null ? null : (
                <Badge variant="outline">{allowance.balance}</Badge>
            )}
            {allowance.state === HarnessAllowanceState.EXHAUSTED ? (
                <Badge variant="destructive">{t("exhausted")}</Badge>
            ) : null}
            {withheld ? <Badge variant="secondary">{t("withheld")}</Badge> : null}
        </div>
    );
}
