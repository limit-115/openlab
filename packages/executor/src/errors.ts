export class ExecutionRequestError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "ExecutionRequestError";
    }
}

export class ArtifactDirectoryExistsError extends ExecutionRequestError {
    readonly artifactDirectory: string;

    constructor(artifactDirectory: string, cause?: unknown) {
        super(`Artifact directory already exists: ${artifactDirectory}`, { cause });
        this.name = "ArtifactDirectoryExistsError";
        this.artifactDirectory = artifactDirectory;
    }
}
