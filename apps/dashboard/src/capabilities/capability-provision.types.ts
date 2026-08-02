export interface CapabilityProvision {
    id: string;
    /** Already normalized by the protocol schema, so the daemon receives what the operator saw. */
    resourceReference: string;
}
