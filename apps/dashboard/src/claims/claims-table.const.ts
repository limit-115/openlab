export const TABLE_SCROLL = "-m-4 overflow-x-auto" as const;

export const CLAIMS_TABLE = "w-full min-w-[660px] border-collapse" as const;

export const TABLE_HEAD_CELL =
    "border-b border-line bg-[rgba(8,12,10,0.28)] px-[14px] py-[11px] text-left text-[8px] font-[700] uppercase text-fg-faint" as const;

export const TABLE_ROW = "group" as const;

export const TABLE_ROW_STALE = "group opacity-[0.57]" as const;

export const TABLE_CELL =
    "border-b border-line px-[14px] py-[11px] text-left text-[10px] text-fg-muted group-last:border-b-0 group-hover:bg-[rgba(255,255,255,0.013)]" as const;

export const TABLE_CELL_NOWRAP =
    "whitespace-nowrap border-b border-line px-[14px] py-[11px] text-left text-[10px] text-fg-muted group-last:border-b-0 group-hover:bg-[rgba(255,255,255,0.013)]" as const;

export const CLAIM_CELL = "flex max-w-[680px] items-start gap-[9px] text-fg-faint" as const;

export const CLAIM_CELL_ICON = "mt-[2px] flex-none" as const;

export const CLAIM_STATEMENT = "text-[11px] font-[530] leading-[1.4] text-[#d5dcd8]" as const;

export const CLAIM_IDENTIFIER = "mt-1 text-[8px] text-fg-faint" as const;

export const EVIDENCE_COUNT_POSITIVE = "inline-flex min-w-[26px] text-[9px] text-green" as const;

export const EVIDENCE_COUNT_NEGATIVE = "inline-flex min-w-[26px] text-[9px] text-red" as const;
