import {
    type HarnessKind,
    HarnessTimeoutMilliseconds
} from "#src/agent-harness/agent-harness.const";
import type { HarnessRunRequest } from "#src/agent-harness/agent-harness.types";
import { HarnessRequestError } from "#src/cli-execution/harness-error";
import { validateTimeoutMilliseconds } from "#src/subscription-cli-harness/harness-run-watchdog";

export function validateHarnessRunRequest(kind: HarnessKind, request: HarnessRunRequest): void {
    if (!request.prompt.trim()) {
        throw new HarnessRequestError(kind, "Harness prompt cannot be empty");
    }
    if (!request.cwd.trim()) {
        throw new HarnessRequestError(kind, "Harness working directory cannot be empty");
    }
    if (!request.artifactDirectory.trim()) {
        throw new HarnessRequestError(kind, "Harness artifact directory cannot be empty");
    }
    if (request.model !== undefined && !request.model.trim()) {
        throw new HarnessRequestError(kind, "Harness model cannot be empty");
    }
    if (request.resumeSessionId !== undefined && !request.resumeSessionId.trim()) {
        throw new HarnessRequestError(kind, "Resume session id cannot be empty");
    }
    const timeoutMs = request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN;
    try {
        validateTimeoutMilliseconds(timeoutMs, "Run timeout");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new HarnessRequestError(kind, message, { cause: error });
    }
}
