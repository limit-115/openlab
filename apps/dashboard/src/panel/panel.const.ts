export const SURFACE_FRAME =
    "overflow-hidden rounded-panel border shadow-[0_10px_36px_rgba(0,0,0,0.14)]" as const;

export const SURFACE_SKIN =
    "border-line bg-[linear-gradient(145deg,rgba(21,27,24,0.97),rgba(15,20,18,0.97))]" as const;

export const PANEL_FRAME = `${SURFACE_FRAME} scroll-mt-[84px] max-[820px]:scroll-mt-3` as const;

export const PANEL_HEADER =
    "flex min-h-[60px] items-center justify-between gap-4 border-b border-line px-4 py-3 max-[620px]:items-start" as const;

export const PANEL_TITLE_GROUP = "flex min-w-0 items-center gap-[10px]" as const;

export const PANEL_ICON =
    "grid h-[31px] w-[31px] flex-none place-items-center rounded-lg border border-line bg-white/2 text-fg-muted" as const;

export const PANEL_TITLE = "mt-px text-[14px] font-[680]" as const;

export const PANEL_ACTION = "flex-none" as const;

export const PANEL_BODY = "p-4" as const;

export const EYEBROW = "text-[8px] font-[720] uppercase text-fg-faint" as const;

export const PANEL_UPDATED_AT = "text-[9px] text-fg-faint max-[620px]:hidden" as const;

export const PANEL_COUNT_BADGE =
    "rounded-full border border-line bg-surface-soft px-[7px] py-1 text-[9px] text-fg-faint" as const;

export const PANEL_COUNT_BADGE_ALERT =
    "rounded-full border border-amber/22 bg-amber/11 px-[7px] py-1 text-[9px] text-amber" as const;
