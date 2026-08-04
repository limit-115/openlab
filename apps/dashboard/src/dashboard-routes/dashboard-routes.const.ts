/** The two addresses that belong to the lab itself rather than to one investigation. */
export const LabRoute = {
    ROSTER: "/",
    SETTINGS: "/settings"
} as const;
export type LabRoute = (typeof LabRoute)[keyof typeof LabRoute];

export const INVESTIGATION_ROUTE = "/investigations/:id" as const;

export function investigationAddress(investigationId: string): string {
    return `/investigations/${encodeURIComponent(investigationId)}`;
}

/** The views one investigation is read through. They are panels of its page, not addresses. */
export const InvestigationView = {
    OVERVIEW: "overview",
    TEAM: "team"
} as const;
export type InvestigationView = (typeof InvestigationView)[keyof typeof InvestigationView];

/** The views one investigation offers, in the order its tabs list them. */
export const INVESTIGATION_VIEWS = [InvestigationView.OVERVIEW, InvestigationView.TEAM] as const;
