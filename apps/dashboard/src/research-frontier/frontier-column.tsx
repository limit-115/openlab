import type { LucideIcon } from "lucide-react";
import { QUIET_NOTE } from "#src/panel/panel-empty-state.const";
import {
    FRONTIER_COLUMN,
    FRONTIER_COLUMN_COUNT,
    FRONTIER_COLUMN_HEADER,
    FRONTIER_COLUMN_ICON_TONE,
    FRONTIER_COLUMN_TITLE,
    FRONTIER_ITEM,
    FRONTIER_ITEM_LIST,
    type FrontierTone
} from "#src/research-frontier/frontier-column.const";

interface FrontierColumnProps {
    title: string;
    icon: LucideIcon;
    items: string[];
    tone: FrontierTone;
}

export function FrontierColumn({ title, icon: Icon, items, tone }: FrontierColumnProps) {
    return (
        <article className={FRONTIER_COLUMN}>
            <header className={FRONTIER_COLUMN_HEADER}>
                <Icon size={15} className={FRONTIER_COLUMN_ICON_TONE[tone]} aria-hidden="true" />
                <h3 className={FRONTIER_COLUMN_TITLE}>{title}</h3>
                <span className={FRONTIER_COLUMN_COUNT}>{items.length}</span>
            </header>
            {items.length > 0 ? (
                <ul className={FRONTIER_ITEM_LIST}>
                    {items.map((item, index) => (
                        <li key={`${title}-${index.toString()}`} className={FRONTIER_ITEM}>
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={QUIET_NOTE}>Nothing recorded</p>
            )}
        </article>
    );
}
