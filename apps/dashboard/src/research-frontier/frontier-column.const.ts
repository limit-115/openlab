export const FrontierTone = {
    GREEN: "green",
    VIOLET: "violet",
    RED: "red",
    AMBER: "amber"
} as const;
export type FrontierTone = (typeof FrontierTone)[keyof typeof FrontierTone];

export const FRONTIER_COLUMN =
    "min-w-0 rounded-[9px] border border-line bg-[rgba(8,12,10,0.34)] p-[13px]" as const;

export const FRONTIER_COLUMN_HEADER =
    "mb-[11px] flex items-center gap-[7px] text-fg-muted" as const;

export const FRONTIER_COLUMN_ICON_TONE: Record<FrontierTone, string> = {
    [FrontierTone.GREEN]: "text-green",
    [FrontierTone.VIOLET]: "text-violet",
    [FrontierTone.RED]: "text-red",
    [FrontierTone.AMBER]: "text-amber"
};

export const FRONTIER_COLUMN_TITLE = "flex-1 text-sm font-[680] uppercase" as const;

export const FRONTIER_COLUMN_COUNT = "text-sm text-fg-faint" as const;

export const FRONTIER_ITEM_LIST = "grid gap-2" as const;

export const FRONTIER_ITEM =
    "relative pl-3 text-sm leading-[1.45] text-[#c5cec9] before:absolute before:top-[0.55em] before:left-0 before:h-1 before:w-1 before:rounded-full before:bg-line-strong before:content-['']" as const;
