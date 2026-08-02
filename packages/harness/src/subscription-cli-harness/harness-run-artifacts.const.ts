export const HarnessArtifactFiles = {
    PROMPT: "prompt.txt",
    RESPONSE_SCHEMA: "response-schema.json",
    NATIVE_EVENTS: "native-events.jsonl",
    EVENTS: "events.jsonl",
    STDERR: "stderr.log",
    MANIFEST: "harness-run.json"
} as const;

export const HARNESS_ARTIFACT_FILE_MODE = 0o600;
