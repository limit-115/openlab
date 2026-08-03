export const CapabilityRequestType = {
    CAPABILITY_REQUEST: "capability_request"
} as const;
export type CapabilityRequestType =
    (typeof CapabilityRequestType)[keyof typeof CapabilityRequestType];

/**
 * A request is either still waiting on the operator or it has been answered. What the answer says —
 * a handed-over credential, a refusal, a redirection back to the agent's own hands — is the
 * operator's free-text prose, never a state the protocol enumerates on their behalf.
 */
export const CapabilityStatus = {
    OPEN: "open",
    ANSWERED: "answered"
} as const;
export type CapabilityStatus = (typeof CapabilityStatus)[keyof typeof CapabilityStatus];
