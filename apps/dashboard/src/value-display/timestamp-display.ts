const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});

export function formatDate(value?: string): string {
    return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatTime(value?: string): string {
    return value ? timeFormatter.format(new Date(value)) : "—";
}
