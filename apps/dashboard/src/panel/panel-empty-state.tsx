import { InboxIcon } from "lucide-react";
import { cn } from "#src/design-system/class-names";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "#src/design-system/empty";

interface PanelEmptyStateProps {
    title: string;
    description: string;
    /** Shrinks the state for panels that only ever hold a short list. */
    compact?: boolean;
}

export function PanelEmptyState({ title, description, compact = false }: PanelEmptyStateProps) {
    return (
        <Empty className={cn("border", compact && "p-6")}>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
