/** Every investigation address the daemon answers on is this path plus what is being asked for. */
export function investigationPath(investigationId: string): string {
    return `/api/investigations/${encodeURIComponent(investigationId)}`;
}
