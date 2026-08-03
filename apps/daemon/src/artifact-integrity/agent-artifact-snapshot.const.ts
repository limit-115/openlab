/** Snapshots live under the run directory, never inside the workspace the agent keeps writing to. */
export const AGENT_SNAPSHOT_DIRECTORY = "artifact-snapshots";

/** A snapshot is read-only the moment it exists: nothing downstream is allowed to rewrite evidence. */
export const AGENT_SNAPSHOT_FILE_MODE = 0o400;
