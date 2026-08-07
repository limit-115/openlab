import {
    type HarnessKind,
    HarnessTimeoutMilliseconds
} from "#src/agent-harness/agent-harness.const";
import type { HarnessRunRequest } from "#src/agent-harness/agent-harness.types";
import { validateTimeoutMilliseconds } from "#src/cli-agent-harness/harness-run-watchdog";
import { HarnessRequestError } from "#src/cli-execution/harness-error";

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
    const timeoutMs = request.timeoutMs ?? HarnessTimeoutMilliseconds.RUN;
    try {
        validateTimeoutMilliseconds(timeoutMs, "Run timeout");
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new HarnessRequestError(kind, message, { cause: error });
    }
}
