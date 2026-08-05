/**
 * Where a lab lives when the operator has not named a home of their own, and what it keeps there.
 * The database sits beside the run directories it is about, so a home is the whole lab.
 */
export const LabHomeLayout = {
    DIRECTORY_NAME: "lab",
    XDG_DATA_SEGMENTS: [".local", "share"],
    DATABASE_FILE: "lab.db"
} as const;
