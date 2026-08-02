import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PanelProps {
    title: string;
    eyebrow?: string;
    icon: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    id?: string;
}

export function Panel({ title, eyebrow, icon: Icon, action, children, className, id }: PanelProps) {
    return (
        <section className={["panel", className].filter(Boolean).join(" ")} id={id}>
            <header className="panel__header">
                <div className="panel__title-group">
                    <span className="panel__icon" aria-hidden="true">
                        <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <div>
                        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
                        <h2>{title}</h2>
                    </div>
                </div>
                {action ? <div className="panel__action">{action}</div> : null}
            </header>
            <div className="panel__body">{children}</div>
        </section>
    );
}
