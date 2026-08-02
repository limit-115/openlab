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

/**
 * The kinds of resource only the operator can hand over. Software an agent can obtain and install
 * on its own — libraries, packages, CLIs, applications, runtimes, plugins, MCP servers — is
 * deliberately absent, so a missing tool cannot be expressed as a capability request at all.
 */
export const CapabilityResourceClass = {
    /** A secret the operator holds: API key, token, certificate, or signed credential. */
    CREDENTIAL: "credential",
    /** A paid, licensed, seat-limited, or approval-gated account, subscription, or quota. */
    ACCOUNT: "account",
    /** Data that cannot be obtained publicly: a private, licensed, or confidential corpus. */
    PRIVATE_DATA: "private_data",
    /** Physical or reserved machine capacity: a device, an accelerator, or a dedicated host. */
    HARDWARE: "hardware",
    /** Permission a person or organization must grant before the work may proceed. */
    AUTHORIZATION: "authorization"
} as const;
export type CapabilityResourceClass =
    (typeof CapabilityResourceClass)[keyof typeof CapabilityResourceClass];
