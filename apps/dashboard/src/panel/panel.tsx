import { type ReactNode, useId } from "react";
import {
    PANEL,
    PANEL_ACTION,
    PANEL_DESCRIPTION,
    PANEL_HEADER,
    PANEL_HEADING,
    PANEL_TITLE
} from "#src/panel/panel.const";

interface PanelProps {
    title: string;
    /** A short line under the title naming what the panel reports on. */
    description?: string;
    /** Rendered beside the title, and under it on a narrow screen. */
    action?: ReactNode;
    children: ReactNode;
}

/**
 * A section of the dashboard. Its title and description are the page speaking, so they are plain
 * text; only what the section reports on is drawn in cards.
 */
export function Panel({ title, description, action, children }: PanelProps) {
    const headingId = useId();

    return (
        <section className={PANEL} aria-labelledby={headingId}>
            <header className={PANEL_HEADER}>
                <div className={PANEL_HEADING}>
                    <h2 id={headingId} className={PANEL_TITLE}>
                        {title}
                    </h2>
                    {description ? <p className={PANEL_DESCRIPTION}>{description}</p> : null}
                </div>
                {action ? <div className={PANEL_ACTION}>{action}</div> : null}
            </header>
            {children}
        </section>
    );
}
