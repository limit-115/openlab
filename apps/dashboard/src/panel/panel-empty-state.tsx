import { Inbox } from "lucide-react";
import {
    EMPTY_STATE,
    EMPTY_STATE_COMPACT,
    EMPTY_STATE_DESCRIPTION,
    EMPTY_STATE_TITLE
} from "#src/panel/panel-empty-state.const";

interface EmptyStateProps {
    title: string;
    description: string;
    compact?: boolean;
}

export function EmptyState({ title, description, compact = false }: EmptyStateProps) {
    return (
        <div className={compact ? EMPTY_STATE_COMPACT : EMPTY_STATE}>
            <Inbox size={20} className="flex-none" aria-hidden="true" />
            <div>
                <strong className={EMPTY_STATE_TITLE}>{title}</strong>
                <p className={EMPTY_STATE_DESCRIPTION}>{description}</p>
            </div>
        </div>
    );
}
