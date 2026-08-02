import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "#src/design-system/card";
import { cn } from "#src/design-system/class-names";
import {
    PANEL_ACTION,
    PANEL_FRAME,
    PANEL_HEADER,
    PANEL_ICON,
    PANEL_TITLE
} from "#src/panel/panel.const";

interface PanelProps {
    title: string;
    /** A short line under the title naming what the panel reports on. */
    description?: string;
    icon: LucideIcon;
    /** Rendered beside the title on wide panels and below it on narrow ones. */
    action?: ReactNode;
    children: ReactNode;
    /** Anchor target for the header section navigation. */
    id?: string;
    className?: string;
    contentClassName?: string;
}

export function Panel({
    title,
    description,
    icon: Icon,
    action,
    children,
    id,
    className,
    contentClassName
}: PanelProps) {
    return (
        <Card id={id} className={cn(PANEL_FRAME, className)}>
            <CardHeader className={PANEL_HEADER}>
                <CardTitle className={PANEL_TITLE}>
                    <span className={PANEL_ICON} aria-hidden="true">
                        <Icon className="size-4" />
                    </span>
                    {title}
                </CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
                {action ? <CardAction className={PANEL_ACTION}>{action}</CardAction> : null}
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
    );
}
