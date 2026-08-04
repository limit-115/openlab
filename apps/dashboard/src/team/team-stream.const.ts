import { investigationPath } from "#src/investigation-roster/investigation-address";

export function agentActivityStreamUrl(investigationId: string): string {
    return `${investigationPath(investigationId)}/agents/activity`;
}
