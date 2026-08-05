/**
 * What a lab passes through on its way up, in the order it passes through them. A caller watching
 * the terminal is told each one as it happens rather than after everything, because the first of
 * them is where a lab that cannot start usually stops.
 */
export const DaemonStartupStep = {
    HOME: "home",
    DATABASE: "database",
    DASHBOARD: "dashboard",
    /**
     * The dashboard is the one thing a lab can come up without, so its absence is a step of its own
     * rather than an outcome every other step has to carry. The rest either happen or throw, and a
     * throw ends the startup instead of reporting anything.
     */
    DASHBOARD_MISSING: "dashboard_missing",
    INVESTIGATIONS: "investigations"
} as const;
export type DaemonStartupStep = (typeof DaemonStartupStep)[keyof typeof DaemonStartupStep];
