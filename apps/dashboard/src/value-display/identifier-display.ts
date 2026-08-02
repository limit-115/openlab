export function formatIdentifier(value: string): string {
    return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}
