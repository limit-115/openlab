import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

/** Every harness the lab can run, in the order a rotation follows when they are all chosen. */
export const DISPATCHABLE_HARNESSES = Object.values(AgentHarnessKind);

/** What the investigation runs on, then what may hold it, then the control that hands both over. */
export const DISPATCH_FORM = "grid gap-4" as const;

export const DISPATCH_FIELD = "grid gap-2" as const;

export const DISPATCH_FIELD_LABEL = "text-sm font-medium" as const;

export const DISPATCH_FIELD_HINT = "text-sm leading-relaxed text-muted-foreground" as const;

export const DISPATCH_HARNESSES = "flex flex-wrap gap-2" as const;

/**
 * The whole card is the target rather than the box in it, so choosing a harness is a click anywhere
 * on it rather than on a checkbox the size of a full stop.
 */
export const DISPATCH_HARNESS =
    "flex min-w-32 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50" as const;

export const DISPATCH_HARNESS_CHOSEN =
    "border-primary/50 bg-primary/10 hover:bg-primary/15" as const;

/** The switch sits on the line it belongs to, with what it does written under both. */
export const DISPATCH_SWITCH_ROW = "flex items-center justify-between gap-6" as const;

export const DISPATCH_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;

export const DISPATCH_FAILURE = "text-sm text-destructive" as const;

/** Takes the place the save was in, so the answer to it lands where the control stood. */
export const DISPATCH_SAVED =
    "flex items-center justify-end gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;

export const DISPATCH_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;
