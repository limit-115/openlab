import { Decimal } from "decimal.js";
import type { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { NO_SPEND_CAP_PERCENT, SpendCapKinds } from "#src/spend-caps/spend-cap.const";
import type { SpendCaps, WalletFloorCap, WindowPercentCap } from "#src/spend-caps/spend-cap.types";
import type {
    AllowanceBalance,
    AllowanceWindow,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

/** How far into one window the lab may spend: the whole of it until an operator asks for less. */
export function windowSpendCap(
    caps: SpendCaps,
    harness: AgentHarnessKind,
    windowMinutes: number
): number {
    return (
        windowCaps(caps).find(
            (cap) => cap.harness === harness && cap.window_minutes === windowMinutes
        )?.max_used_percent ?? NO_SPEND_CAP_PERCENT
    );
}

/** Whether the operator has asked the lab to stop short of what the vendor would still serve. */
export function isCapped(cap: number): boolean {
    return cap < NO_SPEND_CAP_PERCENT;
}

/**
 * How little the lab may leave in one currency of a wallet, or nothing where the operator has asked
 * for no floor. Absence is the answer rather than zero: a wallet the lab may spend to the last cent
 * and one floored at nought are the same instruction, but only one of them was given.
 */
export function walletSpendFloor(
    caps: SpendCaps,
    harness: AgentHarnessKind,
    currency: string
): string | undefined {
    return walletCaps(caps).find((cap) => cap.harness === harness && cap.currency === currency)
        ?.minimum_balance;
}

/**
 * Whether the caps now let the lab spend somewhere the old ones stopped it. Raising a window cap or
 * lowering a wallet floor is the operator answering the wait of everything parked on it, so it is
 * worth acting on; tightening one changes nothing for work that is already held and is left to the
 * next dispatch to notice.
 */
export function isSpendCapLoosened(before: SpendCaps, after: SpendCaps): boolean {
    return windowCapLoosened(before, after) || walletFloorLoosened(before, after);
}

/**
 * The windows that have reached the cap set on them. One of them withholds the whole subscription,
 * however much the others have left: the lab spends a subscription rather than a window, and the
 * vendor stops serving on whichever window runs out first anyway.
 *
 * Only a window an operator actually capped can be withheld. A window at the vendor's own ceiling is
 * a spent allowance, which is a different thing to report and a different thing to act on. And a
 * reading that failed carries no windows at all, so monitoring that broke never withholds a
 * subscription: the lab keeps dispatching and learns the limit from the vendor, as it did before
 * caps existed.
 */
export function withheldWindows(
    allowance: SubscriptionAllowance,
    caps: SpendCaps
): AllowanceWindow[] {
    return allowance.windows.filter((window) => {
        const cap = windowSpendCap(caps, allowance.harness, window.duration_minutes);
        return isCapped(cap) && window.used_percent >= cap;
    });
}

/**
 * The wallet currencies that have fallen to the floor set under them. Like a window, one is enough
 * to withhold the harness: the operator asked for that money to still be there, and spending another
 * currency of the same wallet does not put it back.
 *
 * A currency nobody floored is never withheld, and neither is a floor named in a currency the wallet
 * has stopped reporting — the same rule as everywhere else here, that the lab only holds itself back
 * on a reading it actually got.
 */
export function withheldBalances(
    allowance: SubscriptionAllowance,
    caps: SpendCaps
): AllowanceBalance[] {
    return allowance.balances.filter((balance) => {
        const floor = walletSpendFloor(caps, allowance.harness, balance.currency);
        return floor !== undefined && new Decimal(balance.amount).lessThanOrEqualTo(floor);
    });
}

function windowCaps(caps: SpendCaps): WindowPercentCap[] {
    return caps.filter((cap) => cap.kind === SpendCapKinds.WINDOW_PERCENT);
}

function walletCaps(caps: SpendCaps): WalletFloorCap[] {
    return caps.filter((cap) => cap.kind === SpendCapKinds.WALLET_FLOOR);
}

function windowCapLoosened(before: SpendCaps, after: SpendCaps): boolean {
    return [...windowCaps(before), ...windowCaps(after)].some(
        ({ harness, window_minutes }) =>
            windowSpendCap(after, harness, window_minutes) >
            windowSpendCap(before, harness, window_minutes)
    );
}

/** A floor handed back entirely frees a wallet as surely as one moved down, so both are loosening. */
function walletFloorLoosened(before: SpendCaps, after: SpendCaps): boolean {
    return [...walletCaps(before), ...walletCaps(after)].some(({ harness, currency }) => {
        const held = walletSpendFloor(before, harness, currency);
        if (held === undefined) {
            return false;
        }
        const asked = walletSpendFloor(after, harness, currency);
        return asked === undefined || new Decimal(asked).lessThan(held);
    });
}
