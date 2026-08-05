/**
 * How the lab's connection is set up before it answers anything. Write-ahead logging keeps a reader
 * from blocking the writer and survives a killed daemon; foreign keys are stated rather than
 * assumed, because every cascade in the schema depends on them and the setting belongs to the
 * connection rather than to the file; the busy timeout waits for another process holding the file
 * instead of failing at it.
 */
export const SqlitePragma = {
    JOURNAL_MODE: "PRAGMA journal_mode = WAL",
    FOREIGN_KEYS: "PRAGMA foreign_keys = ON",
    SYNCHRONOUS: "PRAGMA synchronous = NORMAL",
    BUSY_TIMEOUT: "PRAGMA busy_timeout = 5000"
} as const;
