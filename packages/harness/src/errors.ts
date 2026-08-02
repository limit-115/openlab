import type { HarnessKind } from "#src/contract";

export const HarnessErrorCodes = {
    SUBSCRIPTION_AUTH_REQUIRED: "subscription_auth_required",
    INVALID_REQUEST: "invalid_request",
    INVALID_EVENT_STREAM: "invalid_event_stream",
    ABORTED: "aborted"
} as const;

export type HarnessErrorCode = (typeof HarnessErrorCodes)[keyof typeof HarnessErrorCodes];

export interface HarnessCapabilityRequest {
    readonly need: string;
    readonly reason: string;
    readonly provisioningHint: string;
}

export class HarnessError extends Error {
    readonly harness: HarnessKind;
    readonly code: HarnessErrorCode;

    constructor(
        harness: HarnessKind,
        code: HarnessErrorCode,
        message: string,
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = "HarnessError";
        this.harness = harness;
        this.code = code;
    }
}

export class HarnessCapabilityError extends HarnessError {
    readonly capabilityRequest: HarnessCapabilityRequest;

    constructor(
        harness: HarnessKind,
        message: string,
        capabilityRequest: HarnessCapabilityRequest,
        options?: ErrorOptions
    ) {
        super(harness, HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED, message, options);
        this.name = "HarnessCapabilityError";
        this.capabilityRequest = capabilityRequest;
    }
}

export class HarnessRequestError extends HarnessError {
    constructor(harness: HarnessKind, message: string, options?: ErrorOptions) {
        super(harness, HarnessErrorCodes.INVALID_REQUEST, message, options);
        this.name = "HarnessRequestError";
    }
}

export class HarnessProtocolError extends HarnessError {
    constructor(harness: HarnessKind, message: string, options?: ErrorOptions) {
        super(harness, HarnessErrorCodes.INVALID_EVENT_STREAM, message, options);
        this.name = "HarnessProtocolError";
    }
}

export class HarnessAbortedError extends HarnessError {
    constructor(harness: HarnessKind, options?: ErrorOptions) {
        super(harness, HarnessErrorCodes.ABORTED, `${harness} harness was aborted`, options);
        this.name = "HarnessAbortedError";
    }
}
