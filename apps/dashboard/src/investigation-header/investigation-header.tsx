import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { FlaskConicalIcon } from "lucide-react";
import { NavLink } from "react-router";
import { PAGE_FRAME } from "#src/app.const";
import { DASHBOARD_VIEWS } from "#src/dashboard-routes/dashboard-routes.const";
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
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { ModeToggle } from "#src/theme/mode-toggle";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    return (
        <header className={INVESTIGATION_HEADER_BAR}>
            <div className={cn(PAGE_FRAME, INVESTIGATION_HEADER_ROW)}>
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
                            {snapshot.investigation.id}
                        </p>
                    </div>
                </div>

                <nav className={INVESTIGATION_HEADER_VIEWS} aria-label="Views">
                    {DASHBOARD_VIEWS.map((view) => (
                        <NavLink
                            key={view.route}
                            to={view.route}
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
