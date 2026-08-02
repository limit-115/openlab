export function requiredById<Item extends { id: string }>(items: Item[], id: string): Item {
    const item = items.find((candidate) => candidate.id === id);
    if (item === undefined) {
        throw new Error(`Workspace item not found: ${id}`);
    }
    return item;
}

export function replaceById<Item extends { id: string }>(items: Item[], replacement: Item): void {
    const index = items.findIndex(({ id }) => id === replacement.id);
    if (index < 0) {
        throw new Error(`Workspace item not found: ${replacement.id}`);
    }
    items[index] = replacement;
}
