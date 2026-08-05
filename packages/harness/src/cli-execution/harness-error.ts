import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import {
    type HarnessCapabilityGap,
    type HarnessErrorCode,
    HarnessErrorCodes,
    type HarnessTimeoutPhase
} from "#src/cli-execution/harness-error.const";

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
    /** Which of the three things a harness needs was the one it turned out not to have. */
    readonly gap: HarnessCapabilityGap;
    readonly capabilityRequest: HarnessCapabilityRequest;

    constructor(
        harness: HarnessKind,
        gap: HarnessCapabilityGap,
        message: string,
        capabilityRequest: HarnessCapabilityRequest,
        options?: ErrorOptions
    ) {
        super(harness, HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED, message, options);
        this.name = "HarnessCapabilityError";
        this.gap = gap;
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

export class HarnessTimeoutError extends HarnessError {
    readonly phase: HarnessTimeoutPhase;
    readonly timeoutMs: number;

    constructor(harness: HarnessKind, phase: HarnessTimeoutPhase, timeoutMs: number) {
        super(
            harness,
            HarnessErrorCodes.TIMED_OUT,
            `${harness} harness ${phase} timed out after ${timeoutMs} ms`
        );
        this.name = "HarnessTimeoutError";
        this.phase = phase;
        this.timeoutMs = timeoutMs;
    }
}
