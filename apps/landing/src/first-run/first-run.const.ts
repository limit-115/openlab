/**
 * Everything between a finished install and a lab that is researching. Three commands, in the order
 * they are run: what this machine can dispatch to, the lab itself, and the first goal. Nothing is
 * hidden behind a fourth step — a toolchain, a database, a key — because there is no fourth step.
 */
export const FIRST_RUN_STEP = [
    {
        command: "openlab doctor",
        line: "Says which agent CLIs it can find on this machine, and what is missing before it can dispatch to them."
    },
    {
        command: "openlab start",
        line: "Opens the lab, applies its migrations and serves the dashboard. Every investigation it already holds reopens with it."
    },
    {
        command: 'openlab new --goal "Find a faster implementation of a reference algorithm"',
        line: "Starts an investigation: one goal, its own team, its own run directory, running alongside the others."
    }
] as const;
