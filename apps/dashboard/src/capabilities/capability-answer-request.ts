import i18next from "i18next";
import { CAPABILITIES_NAMESPACE } from "#src/capabilities/capabilities.i18n";
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
        throw new Error(i18next.t("unreachable", { ns: CAPABILITIES_NAMESPACE }));
    }

    if (!response.ok) {
        throw new Error(
            refusal(await response.json()) ??
                i18next.t("refused", { ns: CAPABILITIES_NAMESPACE, status: response.status })
        );
    }
}

function refusal(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "error" in payload) {
        return String(payload.error);
    }
    return undefined;
}
