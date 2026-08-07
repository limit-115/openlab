/**
 * Version 2 added `artifacts.session`: the lab's copy of what the CLI itself recorded, which is
 * where a delegating CLI keeps its subagents' transcripts. A version 1 manifest holds only the run's
 * parent thread, and says nothing about what it is missing.
 */
export const HARNESS_MANIFEST_SCHEMA_VERSION = 2;
