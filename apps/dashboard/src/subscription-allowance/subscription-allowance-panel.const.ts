import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";

export const ALLOWANCE_PANEL_TITLE = "Subscriptions" as const;

/** How long a reading stands on the daemon, so polling faster would return the same answer. */
export const ALLOWANCE_REFETCH_MILLISECONDS = 60_000;

export const HARNESS_SUBSCRIPTION_LABEL = {
    [AgentHarnessKind.CODEX]: "Codex",
    [AgentHarnessKind.CLAUDE]: "Claude",
    [AgentHarnessKind.GLM]: "GLM"
} as const;

export const ALLOWANCE_PANEL = "grid gap-3 rounded-2xl border p-4" as const;

export const ALLOWANCE_PANEL_HEADING = "text-base font-medium" as const;

export const ALLOWANCE_LIST = "grid list-none gap-4" as const;

export const ALLOWANCE_ENTRY = "grid min-w-0 gap-2" as const;

export const ALLOWANCE_ENTRY_HEADER = "flex flex-wrap items-center gap-x-3 gap-y-1" as const;

export const ALLOWANCE_SUBSCRIPTION_NAME = "text-sm font-medium" as const;

export const ALLOWANCE_ERROR = "text-sm leading-relaxed text-muted-foreground" as const;

export const ALLOWANCE_WINDOW_LIST = "grid list-none gap-2" as const;

export const ALLOWANCE_WINDOW = "grid gap-1" as const;

export const ALLOWANCE_WINDOW_HEADER =
    "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm" as const;

export const ALLOWANCE_WINDOW_RESET = "text-muted-foreground" as const;

/**
 * A native progress element, so the browser draws the fill and the meter carries its own value to
 * assistive technology. The pseudo-element rules are the only way to reach the parts it paints.
 */
export const ALLOWANCE_METER =
    "h-2 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-foreground" as const;

/** A subscription the lab will pass over reads as spent from across the page. */
export const ALLOWANCE_METER_SPENT =
    "[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive" as const;
