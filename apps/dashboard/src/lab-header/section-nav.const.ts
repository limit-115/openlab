export const SECTION_NAV =
    "flex gap-[3px] rounded-[9px] border border-line bg-[rgba(16,21,19,0.7)] p-1 max-[1240px]:hidden" as const;

export const SECTION_NAV_LINK =
    "rounded-md px-[9px] py-[6px] text-[11px] font-[620] text-fg-muted transition-colors duration-150 ease-[ease] hover:bg-surface-raised hover:text-fg motion-reduce:transition-none" as const;

export const SECTION_LINKS = [
    { href: "#frontier", label: "Frontier" },
    { href: "#operations", label: "Operations" },
    { href: "#evidence", label: "Evidence" },
    { href: "#events", label: "Events" }
] as const;
