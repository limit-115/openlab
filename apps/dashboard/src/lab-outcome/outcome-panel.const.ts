import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";

const PENDING_OUTCOME =
    "border-violet/23 bg-surface/94 bg-[linear-gradient(110deg,rgba(174,141,245,0.11),transparent_58%)]";

export const OUTCOME_SURFACE: Record<LabState, string> = {
    [LabState.RUNNING]: PENDING_OUTCOME,
    [LabState.HIBERNATING]: PENDING_OUTCOME,
    [LabState.STOPPED]: PENDING_OUTCOME,
    [LabState.COMPLETED]:
        "border-green/24 bg-surface/94 bg-[linear-gradient(110deg,rgba(96,211,148,0.12),transparent_58%)]",
    [LabState.FAILED]:
        "border-red/24 bg-surface/94 bg-[linear-gradient(110deg,rgba(240,128,128,0.11),transparent_58%)]"
};

export const OUTCOME_SUMMARY = "max-w-[1100px] text-[14px] leading-[1.55] text-[#d3dad6]" as const;

export const OUTCOME_LIMITATIONS = "mt-4" as const;

export const OUTCOME_LIMITATIONS_HEADING = "mb-[7px] text-[9px] uppercase text-fg-faint" as const;

export const OUTCOME_LIMITATIONS_LIST =
    "grid list-disc gap-[5px] pl-[18px] text-[10px] text-fg-muted" as const;

export const ARTIFACT_LINKS = "mt-[15px] flex flex-wrap gap-2" as const;

export const ARTIFACT_LINK =
    "inline-flex items-center gap-[6px] rounded-md border border-line bg-black/20 px-2 py-[6px] text-fg-faint" as const;

export const ARTIFACT_PATH = "text-[9px] text-fg-muted" as const;
