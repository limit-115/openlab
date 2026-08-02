/** The two things the dashboard can be showing. */
export const DashboardView = {
    OVERVIEW: "overview",
    TEAM: "team"
} as const;
export type DashboardView = (typeof DashboardView)[keyof typeof DashboardView];

/**
 * The Team view names itself in the address, so a reload keeps the operator where they were. Every
 * other fragment belongs to the overview's own section anchors and simply means the overview.
 */
export const TEAM_FRAGMENT = "#team" as const;

export const VIEW_TABS = [
    { view: DashboardView.OVERVIEW, label: "Overview" },
    { view: DashboardView.TEAM, label: "Team" }
] as const;
