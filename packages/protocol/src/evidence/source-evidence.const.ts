export const SourceClassification = {
    PRIMARY: "primary",
    SECONDARY: "secondary"
} as const;
export type SourceClassification = (typeof SourceClassification)[keyof typeof SourceClassification];

export const SourceRetrievalMethod = {
    DAEMON_HTTP: "daemon_http"
} as const;
export type SourceRetrievalMethod =
    (typeof SourceRetrievalMethod)[keyof typeof SourceRetrievalMethod];
