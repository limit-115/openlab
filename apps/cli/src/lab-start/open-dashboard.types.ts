export interface OpenDashboardOptions {
    /** How a browser is asked to show something, so a test can watch without one opening. */
    readonly browser?: (url: string) => Promise<unknown>;
    /** Whether anybody is at this terminal to be shown anything at all. */
    readonly interactive?: boolean;
}
