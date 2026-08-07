/** Only a decimal, or nothing at all. An emptied field is how the operator lifts the floor. */
export const WALLET_FLOOR_PATTERN = /^\d*(\.\d*)?$/;

export const WALLET_FLOOR_ROW = "flex flex-wrap items-center gap-2 text-sm" as const;

export const WALLET_FLOOR_INPUT = "h-8 w-28" as const;

export const WALLET_FLOOR_CURRENCY = "text-muted-foreground" as const;
