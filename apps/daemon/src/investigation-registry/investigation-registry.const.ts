/** How many investigations the lab reopens on startup. Far above what one operator will run. */
export const RESTORED_INVESTIGATION_LIMIT = 1_000;

export const RegistryCloseReason = {
    REMOVED: "Investigation removed",
    DAEMON_CLOSING: "Daemon closing"
} as const;
