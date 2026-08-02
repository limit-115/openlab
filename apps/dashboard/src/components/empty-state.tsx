import { Inbox } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description: string;
    compact?: boolean;
}

export function EmptyState({ title, description, compact = false }: EmptyStateProps) {
    return (
        <div className={compact ? "empty-state empty-state--compact" : "empty-state"}>
            <Inbox size={20} aria-hidden="true" />
            <div>
                <strong>{title}</strong>
                <p>{description}</p>
            </div>
        </div>
    );
}
