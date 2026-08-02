import type { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";

export interface CreateCapabilityRequestInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId?: string;
    readonly need: string;
    readonly resourceClass: CapabilityResourceClass;
    readonly reason: string;
    readonly provisioningHint: string;
    readonly now?: Date;
}
