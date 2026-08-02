export const CapabilityRequestType = {
    CAPABILITY_REQUEST: "capability_request"
} as const;
export type CapabilityRequestType =
    (typeof CapabilityRequestType)[keyof typeof CapabilityRequestType];

export const CapabilityStatus = {
    OPEN: "open",
    PROVIDED: "provided",
    OBSOLETE: "obsolete"
} as const;
export type CapabilityStatus = (typeof CapabilityStatus)[keyof typeof CapabilityStatus];
