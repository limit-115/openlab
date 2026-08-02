export interface CreateCapabilityRequestInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId?: string;
    readonly need: string;
    readonly reason: string;
    readonly provisioningHint: string;
    readonly now?: Date;
}
