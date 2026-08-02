export const CENTER_STATE =
    "flex min-h-screen flex-col items-center justify-center p-6 text-center" as const;

export const CENTER_STATE_MARK =
    "mb-5 grid h-14 w-14 place-items-center rounded-[15px] border" as const;

export const CENTER_STATE_MARK_READY = "border-green/24 bg-green/12 text-green" as const;

export const CENTER_STATE_MARK_ERROR = "border-red/24 bg-red/11 text-red" as const;

export const CENTER_STATE_TITLE = "mt-[7px] mb-2 text-2xl font-[580]" as const;

export const CENTER_STATE_TEXT = "max-w-[470px] text-sm leading-[1.55] text-fg-muted" as const;

export const FLOATING_MARK = "animate-float motion-reduce:animate-none" as const;

export const LOADING_LINE =
    "relative mt-6 h-[2px] w-[210px] overflow-hidden rounded-[2px] bg-line after:absolute after:h-full after:w-[45%] after:animate-loading-sweep after:bg-green after:content-[''] motion-reduce:after:animate-none" as const;

export const COMMAND_HINT =
    "mt-[18px] inline-flex items-center gap-2 rounded-[7px] border border-line bg-surface-soft px-[10px] py-2 text-fg-faint" as const;

export const COMMAND_HINT_CODE = "font-mono text-sm text-fg-muted" as const;

export const PRIMARY_BUTTON =
    "mt-[14px] inline-flex cursor-pointer items-center gap-[7px] rounded-[7px] bg-green px-3 py-2 text-sm font-[680] text-[#07110c] disabled:cursor-not-allowed disabled:opacity-55" as const;

export const SPIN = "animate-spin motion-reduce:animate-none" as const;
