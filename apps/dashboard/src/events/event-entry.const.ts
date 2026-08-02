export const EVENT_ENTRY =
    "group grid grid-cols-[auto_12px_minmax(190px,260px)_minmax(0,1fr)] items-start gap-x-[14px] gap-y-[6px] border-b border-line py-[12px] last:border-b-0 max-[820px]:grid-cols-[auto_12px_minmax(0,1fr)]" as const;

export const EVENT_TIME = "pt-[3px] text-sm whitespace-nowrap tabular-nums text-fg-faint" as const;

export const EVENT_MARKER = "flex flex-col items-center self-stretch pt-[6px]" as const;

export const EVENT_MARKER_DOT =
    "h-[7px] w-[7px] shrink-0 rounded-full border-2 border-surface-raised bg-green shadow-[0_0_0_1px_rgba(96,211,148,0.3)]" as const;

export const EVENT_MARKER_LINE = "mt-[4px] w-px flex-1 bg-line group-last:hidden" as const;

export const EVENT_TYPE =
    "block pt-px text-sm font-[600] break-words capitalize text-[#cad2ce]" as const;

export const EVENT_HEADLINE =
    "mt-[2px] text-sm leading-[1.45] break-words text-fg-muted max-[820px]:col-start-3" as const;

export const EVENT_PAYLOAD =
    "m-0 rounded-[6px] bg-surface-soft px-[10px] py-[7px] font-mono text-sm leading-[1.45] break-words whitespace-pre-wrap text-fg-faint max-[820px]:col-start-3" as const;
