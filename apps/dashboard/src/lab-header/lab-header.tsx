import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { FlaskConicalIcon } from "lucide-react";
import { Link } from "react-router";
import { PAGE_FRAME } from "#src/app.const";
import { VIEW_TABS } from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import { Tabs, TabsList, TabsTrigger } from "#src/design-system/tabs";
import { LabControls } from "#src/lab-control/lab-controls";
import {
    LAB_HEADER_BAR,
    LAB_HEADER_ROW,
    LAB_HEADER_RUNTIME,
    LAB_HEADER_VIEWS
} from "#src/lab-header/lab-header.const";
import { RuntimeStrip } from "#src/lab-header/runtime-strip";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface LabHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
    /** The address being shown, which is what marks one of the views as the open one. */
    view: string;
}

export function LabHeader({ snapshot, stream, view }: LabHeaderProps) {
    return (
        <header className={LAB_HEADER_BAR}>
            <div className={cn(PAGE_FRAME, LAB_HEADER_ROW)}>
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className="grid size-9 flex-none place-items-center rounded-xl bg-primary/10 text-primary"
                        aria-hidden="true"
                    >
                        <FlaskConicalIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-base font-semibold">Research Lab</p>
                        <p className="text-sm break-words text-muted-foreground">
                            {snapshot.lab.id}
                        </p>
                    </div>
                </div>

                <Tabs value={view} className={LAB_HEADER_VIEWS}>
                    <TabsList>
                        {VIEW_TABS.map((tab) => (
                            <TabsTrigger key={tab.route} value={tab.route} asChild>
                                <Link to={tab.route}>{tab.label}</Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className={LAB_HEADER_RUNTIME}>
                    <RuntimeStrip snapshot={snapshot} stream={stream} />
                    <LabControls state={snapshot.lab.state} />
                </div>
            </div>
        </header>
    );
}
