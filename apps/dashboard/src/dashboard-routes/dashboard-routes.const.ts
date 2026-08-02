/** The two addresses the dashboard answers on. */
export const DashboardRoute = {
    OVERVIEW: "/",
    TEAM: "/team"
} as const;
export type DashboardRoute = (typeof DashboardRoute)[keyof typeof DashboardRoute];

export const VIEW_TABS = [
    { route: DashboardRoute.OVERVIEW, label: "Overview" },
    { route: DashboardRoute.TEAM, label: "Team" }
] as const;
