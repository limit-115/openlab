import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
    EYEBROW,
    PANEL_ACTION,
    PANEL_BODY,
    PANEL_FRAME,
    PANEL_HEADER,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_TITLE_GROUP,
    SURFACE_SKIN
} from "#src/panel/panel.const";

interface PanelProps {
    title: string;
    eyebrow?: string;
    icon: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    /** Border colour and background of the panel surface. */
    surface?: string;
    /** Layout of the panel body. */
    body?: string;
    id?: string;
}

export function Panel({
    title,
    eyebrow,
    icon: Icon,
    action,
    children,
    surface = SURFACE_SKIN,
    body = PANEL_BODY,
    id
}: PanelProps) {
    return (
        <section className={`${PANEL_FRAME} ${surface}`} id={id}>
            <header className={PANEL_HEADER}>
                <div className={PANEL_TITLE_GROUP}>
                    <span className={PANEL_ICON} aria-hidden="true">
                        <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <div>
                        {eyebrow ? <p className={EYEBROW}>{eyebrow}</p> : null}
                        <h2 className={PANEL_TITLE}>{title}</h2>
                    </div>
                </div>
                {action ? <div className={PANEL_ACTION}>{action}</div> : null}
            </header>
            <div className={body}>{children}</div>
        </section>
    );
}
