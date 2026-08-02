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

interface PanelProps {
    title: string;
    /** A short line under the title naming what the panel reports on. */
    description?: string;
    icon: LucideIcon;
    /** Rendered at the top right of the panel header. */
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
        <Card id={id} className={cn("scroll-mt-24", className)}>
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-3">
                    <span
                        className="grid size-8 flex-none place-items-center rounded-xl bg-muted text-muted-foreground"
                        aria-hidden="true"
                    >
                        <Icon className="size-4" />
                    </span>
                    {title}
                </CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
                {action ? <CardAction>{action}</CardAction> : null}
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
    );
}
