export function idsOf(records: readonly { readonly id: string }[]): string[] {
    return records.map(({ id }) => id);
}

export function assertUpserted(
    records: readonly { readonly id: string }[],
    kind: string,
    id: string
): void {
    if (records.length !== 1) {
        throw new Error(`Failed to project ${kind} ${id}`);
    }
}
