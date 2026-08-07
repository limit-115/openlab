import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { isCapped } from "@openlab/protocol/spend-caps/spend-cap";
import { SpendCapKinds } from "@openlab/protocol/spend-caps/spend-cap.const";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";

/**
 * Moves the cap on one window. Handing back the whole window drops the entry rather than writing it
 * down at the vendor's ceiling: a window nobody capped is one the lab was never told to stop short
 * of, and that is what an empty list means everywhere else.
 */
export function withWindowCap(
    caps: SpendCaps,
    harness: AgentHarnessKind,
    windowMinutes: number,
    percent: number
): SpendCaps {
    const others = caps.filter(
        (cap) =>
            cap.kind !== SpendCapKinds.WINDOW_PERCENT ||
            cap.harness !== harness ||
            cap.window_minutes !== windowMinutes
    );
    return isCapped(percent)
        ? [
              ...others,
              {
                  kind: SpendCapKinds.WINDOW_PERCENT,
                  harness,
                  window_minutes: windowMinutes,
                  max_used_percent: percent
              }
          ]
        : others;
}

/**
 * Moves the floor under one currency of a wallet. An emptied field drops the entry, which is how the
 * operator says the lab may spend that money to the last cent; a floor of nought is a different
 * instruction they typed on purpose, and it is kept.
 */
export function withWalletFloor(
    caps: SpendCaps,
    harness: AgentHarnessKind,
    currency: string,
    floor: string
): SpendCaps {
    const others = caps.filter(
        (cap) =>
            cap.kind !== SpendCapKinds.WALLET_FLOOR ||
            cap.harness !== harness ||
            cap.currency !== currency
    );
    return floor.trim() === ""
        ? others
        : [
              ...others,
              {
                  kind: SpendCapKinds.WALLET_FLOOR,
                  harness,
                  currency,
                  minimum_balance: floor.trim()
              }
          ];
}

/**
 * The caps as the lab is handed them. A floor is typed a character at a time, so the draft holds
 * money on its way to being money — a point with no figure after it yet, a point with no figure
 * before it — and the protocol takes neither. Settling them here rather than as they are typed is
 * what lets the operator keep typing: a field that rewrote `5.` to `5` under them would eat the
 * point every time they reached for the cents.
 */
export function settledCaps(caps: SpendCaps): SpendCaps {
    return caps.flatMap((cap): SpendCaps => {
        if (cap.kind !== SpendCapKinds.WALLET_FLOOR) {
            return [cap];
        }
        const settled = settledAmount(cap.minimum_balance);
        return settled === "" ? [] : [{ ...cap, minimum_balance: settled }];
    });
}

/**
 * What a half-typed floor stands for: `5.` is five, `.5` is nought point five, and a lone point is
 * no figure at all, which lifts the floor exactly as an emptied field does.
 */
function settledAmount(typed: string): string {
    const amount = typed.trim();
    const whole = amount.endsWith(".") ? amount.slice(0, -1) : amount;
    return whole.startsWith(".") ? `0${whole}` : whole;
}

/**
 * Whether the page is holding a cap the lab has not been given. The caps are compared meter by meter
 * rather than as a list, because moving one rewrites its entry and the order it lands in says
 * nothing about what the lab will do.
 */
export function hasCapEdits(draft: SpendCaps, saved: SpendCaps): boolean {
    const held = capsByMeter(saved);
    return (
        draft.length !== saved.length ||
        [...capsByMeter(draft)].some(([meter, stop]) => held.get(meter) !== stop)
    );
}

/** Each cap under the meter it stops, and the point it stops it at, written the same way for both. */
function capsByMeter(caps: SpendCaps): Map<string, string> {
    return new Map(
        caps.map((cap) =>
            cap.kind === SpendCapKinds.WINDOW_PERCENT
                ? ([
                      `${cap.kind}:${cap.harness}:${cap.window_minutes}`,
                      String(cap.max_used_percent)
                  ] as const)
                : ([`${cap.kind}:${cap.harness}:${cap.currency}`, cap.minimum_balance] as const)
        )
    );
}
