/** The lab's database, kept in the lab's home beside the run directories it is about. */
export const LAB_DATABASE_FILE = "lab.db";

export const DaemonLogLevel = {
    TRACE: "trace",
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
    FATAL: "fatal",
    SILENT: "silent"
} as const;
export type DaemonLogLevel = (typeof DaemonLogLevel)[keyof typeof DaemonLogLevel];
