import { ExperimentStatus } from "@lab/protocol/constants";

export const EXPERIMENT_LIST = "grid gap-[7px]" as const;

export const EXPERIMENT_CARD =
    "grid grid-cols-[auto_minmax(0,1fr)] gap-[10px] rounded-lg border border-line bg-[rgba(8,12,10,0.25)] p-[11px]" as const;

export const EXPERIMENT_STATUS =
    "grid h-[25px] w-[25px] place-items-center rounded-[7px] border" as const;

export const EXPERIMENT_STATUS_TONE: Record<ExperimentStatus, string> = {
    [ExperimentStatus.PLANNED]: "border-line text-fg-faint",
    [ExperimentStatus.RUNNING]: "border-cyan/20 bg-cyan/10 text-cyan",
    [ExperimentStatus.SUCCEEDED]: "border-line text-green",
    [ExperimentStatus.FAILED]: "border-line text-red",
    [ExperimentStatus.TIMED_OUT]: "border-line text-red",
    [ExperimentStatus.CANCELLED]: "border-line text-red"
};

export const EXPERIMENT_HEADER = "flex items-start justify-between gap-3" as const;

export const EXPERIMENT_HYPOTHESIS = "text-[11px] font-[570] leading-[1.4]" as const;

export const EXPERIMENT_COMMAND =
    "my-2 flex min-w-0 items-center gap-[7px] rounded-[5px] bg-black/22 px-2 py-[6px] text-fg-faint" as const;

export const EXPERIMENT_COMMAND_TEXT =
    "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] text-[#99a69f]" as const;

export const EXPERIMENT_FOOTER =
    "flex flex-wrap gap-x-[13px] gap-y-[6px] font-mono text-[8px] text-fg-faint" as const;
