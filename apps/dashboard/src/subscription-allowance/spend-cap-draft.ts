import type { AgentHarnessKind } from "@nightlab/protocol/agents/agent-execution.const";
import { isCapped } from "@nightlab/protocol/spend-caps/spend-cap";
import type { SpendCaps } from "@nightlab/protocol/spend-caps/spend-cap.types";

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
        (cap) => cap.harness !== harness || cap.window_minutes !== windowMinutes
    );
    return isCapped(percent)
        ? [...others, { harness, window_minutes: windowMinutes, max_used_percent: percent }]
        : others;
}

/**
 * Whether the page is holding a cap the lab has not been given. The caps are compared window by
 * window rather than as a list, because dragging one handle rewrites the entry and the order it
 * lands in says nothing about what the lab will do.
 */
export function hasCapEdits(draft: SpendCaps, saved: SpendCaps): boolean {
    const held = capsByWindow(saved);
    return (
        draft.length !== saved.length ||
        [...capsByWindow(draft)].some(([window, percent]) => held.get(window) !== percent)
    );
}

function capsByWindow(caps: SpendCaps): Map<string, number> {
    return new Map(
        caps.map((cap) => [`${cap.harness}:${cap.window_minutes}`, cap.max_used_percent])
    );
}
