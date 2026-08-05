/**
 * What a lab passes through on its way up, in the order it passes through them. A caller watching
 * the terminal is told each one as it happens rather than after everything, because the first of
 * them is where a lab that cannot start usually stops.
 */
export const DaemonStartupStep = {
    LAB_HOME: "lab_home",
    DATABASE: "database",
    DASHBOARD: "dashboard",
    INVESTIGATIONS: "investigations"
} as const;
export type DaemonStartupStep = (typeof DaemonStartupStep)[keyof typeof DaemonStartupStep];

/** Whether a step left the lab with the thing it was about. Only the dashboard may be missing. */
export const DaemonStartupOutcome = {
    READY: "ready",
    MISSING: "missing"
} as const;
export type DaemonStartupOutcome = (typeof DaemonStartupOutcome)[keyof typeof DaemonStartupOutcome];
