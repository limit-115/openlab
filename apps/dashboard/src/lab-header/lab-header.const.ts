export const TOPBAR =
    "sticky top-0 z-20 grid min-h-[68px] grid-cols-[minmax(190px,1fr)_auto_minmax(450px,1fr)] items-center gap-6 border-b border-b-[rgba(53,64,59,0.8)] bg-[rgba(8,11,10,0.88)] px-[clamp(18px,3vw,48px)] py-[9px] backdrop-blur-[18px] max-[1240px]:grid-cols-[minmax(190px,1fr)_auto] max-[820px]:relative max-[820px]:grid-cols-1 max-[820px]:gap-[10px] max-[820px]:py-[13px]" as const;

export const BRAND = "flex min-w-0 items-center gap-[11px]" as const;

export const BRAND_MARK =
    "grid h-[38px] w-[38px] flex-none place-items-center rounded-[10px] border border-green/26 bg-[linear-gradient(145deg,rgba(96,211,148,0.13),rgba(96,211,148,0.03))] text-green" as const;

export const BRAND_NAME = "text-sm font-[680]" as const;

export const BRAND_ID =
    "mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-fg-faint" as const;
