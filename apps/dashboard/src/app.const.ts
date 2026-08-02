export const APP_SHELL = "min-h-screen" as const;

export const DASHBOARD =
    "mx-auto grid w-[min(1680px,100%)] gap-[14px] px-[clamp(18px,3vw,48px)] pt-6 pb-12 max-[620px]:pt-[14px]" as const;

export const CONTENT_GRID =
    "grid grid-cols-[minmax(0,1.75fr)_minmax(320px,0.75fr)] items-start gap-[14px] max-[1240px]:grid-cols-1" as const;

export const CONTENT_GRID_MAIN = "grid min-w-0 gap-[14px]" as const;

export const CONTENT_GRID_ASIDE =
    "grid min-w-0 gap-[14px] max-[1240px]:grid-cols-2 max-[1240px]:items-start max-[620px]:grid-cols-1" as const;

export const APP_FOOTER =
    "mx-auto flex w-[min(1680px,100%)] justify-between px-[clamp(18px,3vw,48px)] pb-7 text-sm text-fg-faint max-[620px]:flex-col max-[620px]:gap-[5px]" as const;
