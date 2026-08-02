import type { LucideIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import {
    FRONTIER_COLUMN,
    FRONTIER_COLUMN_HEADER,
    FRONTIER_COLUMN_TITLE,
    FRONTIER_ITEM_LIST
} from "#src/research-frontier/frontier-column.const";

interface FrontierColumnProps {
    title: string;
    icon: LucideIcon;
    items: string[];
}

export function FrontierColumn({ title, icon: Icon, items }: FrontierColumnProps) {
    return (
        <article className={FRONTIER_COLUMN}>
            <header className={FRONTIER_COLUMN_HEADER}>
                <Icon className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
                <h3 className={FRONTIER_COLUMN_TITLE}>{title}</h3>
                <Badge variant="outline">{items.length}</Badge>
            </header>
            {items.length > 0 ? (
                <ul className={FRONTIER_ITEM_LIST}>
                    {items.map((item, index) => (
                        <li key={`${title}-${index.toString()}`}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">Nothing recorded</p>
            )}
        </article>
    );
}
