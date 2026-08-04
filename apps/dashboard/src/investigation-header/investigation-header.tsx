import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { ArrowLeftIcon } from "lucide-react";
import { Link, NavLink } from "react-router";
import { PAGE_FRAME } from "#src/app.const";
import {
    INVESTIGATION_VIEWS,
    investigationView,
    LabRoute
} from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import {
    INVESTIGATION_HEADER_BAR,
    INVESTIGATION_HEADER_ROW,
    INVESTIGATION_HEADER_RUNTIME,
    INVESTIGATION_HEADER_VIEW,
    INVESTIGATION_HEADER_VIEW_CURRENT,
    INVESTIGATION_HEADER_VIEWS
} from "#src/investigation-header/investigation-header.const";
import { RuntimeStrip } from "#src/investigation-header/runtime-strip";
import { BACK_TO_LAB_LABEL } from "#src/lab-shell/lab-shell.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { ModeToggle } from "#src/theme/mode-toggle";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

/** What the operator is reading, and the way back to everything else the lab is working on. */
export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    return (
        <header className={INVESTIGATION_HEADER_BAR}>
            <div className={cn(PAGE_FRAME, INVESTIGATION_HEADER_ROW)}>
                <div className="flex min-w-0 items-center gap-3">
                    <Link
                        to={LabRoute.ROSTER}
                        aria-label={BACK_TO_LAB_LABEL}
                        className="grid size-9 flex-none place-items-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 motion-reduce:transition-none"
                    >
                        <ArrowLeftIcon className="size-5" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-base font-semibold break-words">
                            {snapshot.investigation.goal}
                        </p>
                        <p className="text-sm break-words text-muted-foreground">
                            {snapshot.investigation.id}
                        </p>
                    </div>
                </div>

                <nav className={INVESTIGATION_HEADER_VIEWS} aria-label="Views">
                    {INVESTIGATION_VIEWS.map((view) => (
                        <NavLink
                            key={view.label}
                            to={investigationView(snapshot.investigation.id, view.view)}
                            end
                            className={({ isActive }) =>
                                cn(
                                    INVESTIGATION_HEADER_VIEW,
                                    isActive && INVESTIGATION_HEADER_VIEW_CURRENT
                                )
                            }
                        >
                            {view.label}
                        </NavLink>
                    ))}
                </nav>

                <div className={INVESTIGATION_HEADER_RUNTIME}>
                    <RuntimeStrip snapshot={snapshot} stream={stream} />
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
