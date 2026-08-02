import { CAPABILITY_UNREACHABLE } from "#src/capabilities/capability-provision.const";
import type { CapabilityProvision } from "#src/capabilities/capability-provision.types";

/**
 * Hands a resource to an open capability request. A refusal keeps the daemon's own wording, because
 * it names what the request already settled as.
 */
export async function provideCapability({
    id,
    resourceReference
}: CapabilityProvision): Promise<void> {
    let response: Response;
    try {
        response = await fetch(`/api/capabilities/${encodeURIComponent(id)}/provide`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ resource_reference: resourceReference })
        });
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
