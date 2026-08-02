import { SURFACE_FRAME, SURFACE_SKIN } from "#src/panel/panel.const";

export const MetricTone = {
    CYAN: "cyan",
    VIOLET: "violet",
    GREEN: "green",
    AMBER: "amber"
} as const;
export type MetricTone = (typeof MetricTone)[keyof typeof MetricTone];

export const METRIC =
    `${SURFACE_FRAME} ${SURFACE_SKIN} flex min-h-[83px] items-center gap-[13px] p-[15px] max-[620px]:min-h-[70px]` as const;

export const METRIC_ICON =
    "grid h-[35px] w-[35px] place-items-center rounded-[9px] border" as const;

export const METRIC_ICON_TONE: Record<MetricTone, string> = {
    [MetricTone.CYAN]: "border-cyan/20 bg-cyan/10 text-cyan",
    [MetricTone.VIOLET]: "border-violet/20 bg-violet/11 text-violet",
    [MetricTone.GREEN]: "border-green/20 bg-green/12 text-green",
    [MetricTone.AMBER]: "border-amber/20 bg-amber/11 text-amber"
};

export const METRIC_LABEL = "text-[10px] font-[620] text-fg-muted" as const;

export const METRIC_VALUE = "mt-1 font-mono text-[21px] font-[520] leading-none" as const;

export const METRIC_TOTAL = "text-[10px] text-fg-faint" as const;
