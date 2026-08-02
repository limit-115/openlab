export const OVERVIEW =
    "grid grid-cols-[minmax(380px,1.35fr)_minmax(520px,1fr)] gap-[14px] max-[1240px]:grid-cols-1" as const;

export const GOAL_PANEL_SURFACE =
    "border-line bg-[linear-gradient(110deg,rgba(96,211,148,0.055),transparent_55%),linear-gradient(145deg,rgba(21,27,24,0.97),rgba(15,20,18,0.97))]" as const;

export const GOAL_PANEL_BODY =
    "flex min-h-[105px] flex-col justify-center px-5 pt-[19px] pb-[22px] max-[620px]:min-h-[90px]" as const;

export const GOAL_STATEMENT =
    "max-w-[980px] text-[clamp(19px,1.8vw,27px)] font-[550] leading-[1.28] tracking-[-0.026em]" as const;

export const GOAL_REASON = "mt-3 text-[12px] leading-[1.55] text-fg-muted" as const;

export const METRIC_GRID = "grid grid-cols-2 gap-[10px] max-[620px]:grid-cols-1" as const;
