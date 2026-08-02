export const ClaimStatus = {
    PROPOSED: "proposed",
    TESTING: "testing",
    SUPPORTED: "supported",
    REFUTED: "refuted",
    REPRODUCED: "reproduced"
} as const;
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];
