/** The two addresses that belong to the lab itself rather than to one investigation. */
export const LabRoute = {
    ROSTER: "/",
    SETTINGS: "/settings"
} as const;
export type LabRoute = (typeof LabRoute)[keyof typeof LabRoute];

export const INVESTIGATION_ROUTE = "/investigations/:id" as const;

/** The views one investigation is read through, as path segments under its own address. */
export const InvestigationView = {
    OVERVIEW: "",
    TEAM: "team"
} as const;
export type InvestigationView = (typeof InvestigationView)[keyof typeof InvestigationView];

export function investigationView(
    investigationId: string,
    view: InvestigationView = InvestigationView.OVERVIEW
): string {
    const address = `/investigations/${encodeURIComponent(investigationId)}`;
    return view === InvestigationView.OVERVIEW ? address : `${address}/${view}`;
}

/** The addresses the lab header links to, in the order an operator reads them. */
export const LAB_VIEWS = [
    { route: LabRoute.ROSTER, label: "Investigations" },
    { route: LabRoute.SETTINGS, label: "Settings" }
] as const;

/** The views one investigation offers, in the order its header lists them. */
export const INVESTIGATION_VIEWS = [
    { view: InvestigationView.OVERVIEW, label: "Overview" },
    { view: InvestigationView.TEAM, label: "Team" }
] as const;
