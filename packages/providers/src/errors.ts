export type ProviderErrorCode =
    | "aborted"
    | "authentication"
    | "capability_missing"
    | "invalid_output"
    | "invalid_request"
    | "missing_credential"
    | "rate_limited"
    | "timeout"
    | "unavailable"
    | "unknown";

export interface CapabilityRequestDetails {
    readonly need: string;
    readonly reason: string;
    readonly provisioningHint: string;
}

export interface ProviderErrorOptions {
    readonly cause?: unknown;
    readonly provider: string;
    readonly retryable?: boolean;
    readonly capabilityRequest?: CapabilityRequestDetails;
}

export class ProviderError extends Error {
    readonly code: ProviderErrorCode;
    readonly provider: string;
    readonly retryable: boolean;
    readonly capabilityRequest: CapabilityRequestDetails | undefined;

    constructor(code: ProviderErrorCode, message: string, options: ProviderErrorOptions) {
        super(message, { cause: options.cause });
        this.name = "ProviderError";
        this.code = code;
        this.provider = options.provider;
        this.retryable = options.retryable ?? false;
        this.capabilityRequest = options.capabilityRequest;
    }
}

export class MissingProviderCredentialError extends ProviderError {
    readonly environmentVariable: string;

    constructor(provider: string, environmentVariable: string) {
        super("missing_credential", `${provider} requires ${environmentVariable}`, {
            provider,
            capabilityRequest: {
                need: `${environmentVariable} for the ${provider} model provider`,
                reason: `Model generation through ${provider} cannot start without credentials`,
                provisioningHint: `Set ${environmentVariable} in the daemon environment`
            }
        });
        this.name = "MissingProviderCredentialError";
        this.environmentVariable = environmentVariable;
    }
}

export class ProviderCapabilityError extends ProviderError {
    constructor(provider: string, capability: string, reason: string) {
        super("capability_missing", `${provider} cannot provide ${capability}: ${reason}`, {
            provider,
            capabilityRequest: {
                need: capability,
                reason,
                provisioningHint: `Configure or register a provider that supports ${capability}`
            }
        });
        this.name = "ProviderCapabilityError";
    }
}

export class InvalidProviderOutputError extends ProviderError {
    readonly validationErrors: readonly string[];

    constructor(
        provider: string,
        message: string,
        validationErrors: readonly string[],
        cause?: unknown
    ) {
        super("invalid_output", message, { provider, cause });
        this.name = "InvalidProviderOutputError";
        this.validationErrors = validationErrors;
    }
}
