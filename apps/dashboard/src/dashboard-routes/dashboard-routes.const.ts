/** The two addresses the dashboard answers on. */
export const DashboardRoute = {
    OVERVIEW: "/",
    TEAM: "/team"
} as const;
export type DashboardRoute = (typeof DashboardRoute)[keyof typeof DashboardRoute];

/** The addresses the header links to, in the order an operator reads them. */
export const DASHBOARD_VIEWS = [
    { route: DashboardRoute.OVERVIEW, label: "Overview" },
    { route: DashboardRoute.TEAM, label: "Team" }
] as const;
