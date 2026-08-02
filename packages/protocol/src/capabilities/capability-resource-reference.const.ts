export const CapabilityResourceScheme = {
    DATASET: "dataset:",
    TOOLCHAIN: "toolchain:",
    KEYCHAIN: "keychain:",
    FILE: "file:"
} as const;
export type CapabilityResourceScheme =
    (typeof CapabilityResourceScheme)[keyof typeof CapabilityResourceScheme];
