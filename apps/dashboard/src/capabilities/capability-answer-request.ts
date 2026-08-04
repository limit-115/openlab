import { CAPABILITY_UNREACHABLE } from "#src/capabilities/capability-answer.const";
import type { CapabilityAnswer } from "#src/capabilities/capability-answer.types";
import { investigationPath } from "#src/investigation-roster/investigation-address";

/**
 * Settles an open capability request. A refusal keeps the daemon's own wording, because it names
 * what the request already settled as.
 */
export async function answerCapability({
    investigationId,
    id,
    answer
}: CapabilityAnswer): Promise<void> {
    let response: Response;
    try {
        response = await fetch(
            `${investigationPath(investigationId)}/capabilities/${encodeURIComponent(id)}/answer`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ answer })
            }
        );
    } catch {
        throw new Error(CAPABILITY_UNREACHABLE);
    }

    if (!response.ok) {
        throw new Error(
            refusal(await response.json()) ?? `The lab refused with ${response.status}.`
        );
    }
}

function refusal(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "error" in payload) {
        return String(payload.error);
    }
    return undefined;
}
