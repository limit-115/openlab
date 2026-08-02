export const ResearchStage = {
    DIRECTOR: "director",
    RESEARCHER: "researcher",
    CRITIC: "critic",
    VERIFIER: "verifier"
} as const;
export type ResearchStage = (typeof ResearchStage)[keyof typeof ResearchStage];
