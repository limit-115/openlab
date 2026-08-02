import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";

export const RUNTIME_STRIP =
    "flex items-center justify-end gap-[18px] max-[820px]:justify-start max-[820px]:border-t max-[820px]:border-line max-[820px]:pt-[9px] max-[620px]:grid max-[620px]:grid-cols-2 max-[620px]:gap-3" as const;

export const RUNTIME_STRIP_ITEM = "flex items-center gap-2" as const;

export const RUNTIME_STRIP_ICON = "text-fg-faint" as const;

export const RUNTIME_STRIP_LABEL =
    "text-[9px] font-[650] uppercase leading-[1.25] text-fg-faint" as const;

export const RUNTIME_STRIP_VALUE = "mt-[2px] text-[11px] font-[600] leading-[1.25]" as const;

export const STATE_DOT = "h-2 w-2 rounded-full" as const;

export const STATE_DOT_TONE: Record<LabState, string> = {
    [LabState.RUNNING]:
        "bg-green shadow-[0_0_0_4px_rgba(96,211,148,0.12),0_0_12px_rgba(96,211,148,0.45)]",
    [LabState.COMPLETED]:
        "bg-green shadow-[0_0_0_4px_rgba(96,211,148,0.12),0_0_12px_rgba(96,211,148,0.45)]",
    [LabState.HIBERNATING]: "bg-violet shadow-[0_0_0_4px_rgba(174,141,245,0.11)]",
    [LabState.FAILED]: "bg-red shadow-[0_0_0_4px_rgba(240,128,128,0.11)]",
    [LabState.STOPPED]: "bg-fg-faint shadow-[0_0_0_4px_rgba(102,115,108,0.1)]"
};
