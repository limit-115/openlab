export const EVENT_ENTRY =
    "group grid min-h-[47px] grid-cols-[56px_auto_minmax(0,1fr)] gap-[10px]" as const;

export const EVENT_TIME = "pt-[2px] font-mono text-[8px] text-fg-faint" as const;

export const EVENT_MARKER =
    "relative mt-[3px] h-[7px] w-[7px] rounded-full border-2 border-surface-raised bg-green shadow-[0_0_0_1px_rgba(96,211,148,0.3)] after:absolute after:top-2 after:left-px after:h-9 after:w-px after:bg-line after:content-[''] group-last:after:hidden" as const;

export const EVENT_TYPE = "-mt-px block text-[10px] font-[600] capitalize text-[#cad2ce]" as const;

export const EVENT_PAYLOAD =
    "mt-1 mb-2 line-clamp-2 overflow-hidden text-[9px] leading-[1.35] text-fg-faint" as const;
