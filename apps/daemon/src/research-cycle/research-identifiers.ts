export interface InitialResearchIdentifiers {
    readonly branchId: string;
    readonly agentId: string;
    readonly taskId: string;
}

export function initialResearchIdentifiers(labId: string): InitialResearchIdentifiers {
    return {
        branchId: `${labId}-branch-director`,
        agentId: `${labId}-agent-director`,
        taskId: `${labId}-task-understand`
    };
}
