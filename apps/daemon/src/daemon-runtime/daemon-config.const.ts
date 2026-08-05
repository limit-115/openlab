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
