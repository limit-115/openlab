import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";

export const CAPABILITY_LIST = "grid gap-2" as const;

export const CAPABILITY_CARD =
    "grid grid-cols-[auto_minmax(0,1fr)] gap-[10px] rounded-lg border p-[11px]" as const;

export const CAPABILITY_CARD_TONE: Record<CapabilityStatus, string> = {
    [CapabilityStatus.OPEN]:
        "border-amber/19 bg-[linear-gradient(110deg,rgba(234,190,107,0.11),transparent_75%)]",
    [CapabilityStatus.PROVIDED]: "border-line bg-[rgba(8,12,10,0.25)]",
    [CapabilityStatus.OBSOLETE]: "border-line bg-[rgba(8,12,10,0.25)]"
};

export const CAPABILITY_ICON =
    "grid h-[29px] w-[29px] place-items-center rounded-[7px] border border-amber/20 bg-amber/11 text-amber" as const;

export const CAPABILITY_HEADER = "flex items-start justify-between gap-2" as const;

export const CAPABILITY_NEED = "text-[11px] font-[620] leading-[1.35]" as const;

export const CAPABILITY_REASON = "mt-[6px] mb-2 text-[10px] leading-[1.45] text-fg-muted" as const;

export const PROVISIONING_HINT = "grid gap-1 rounded-md bg-black/20 p-[7px]" as const;

export const PROVISIONING_HINT_LABEL =
    "text-[8px] font-[680] uppercase tracking-[0.06em] text-fg-faint" as const;

export const PROVISIONING_HINT_COMMAND =
    "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[8px] text-amber" as const;

export const PROVISIONING_HINT_NOTE = "text-[8px] leading-[1.4] text-fg-faint" as const;

export const CAPABILITY_FOOTER =
    "mt-[7px] font-mono text-[8px] leading-[1.4] text-fg-faint" as const;
