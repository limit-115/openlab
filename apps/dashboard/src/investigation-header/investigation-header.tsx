import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { NavLink } from "react-router";
import {
    INVESTIGATION_VIEWS,
    investigationView
} from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import {
    INVESTIGATION_HEADER_ROW,
    INVESTIGATION_HEADER_VIEW,
    INVESTIGATION_HEADER_VIEW_CURRENT,
    INVESTIGATION_HEADER_VIEWS
} from "#src/investigation-header/investigation-header.const";
import { RuntimeStrip } from "#src/investigation-header/runtime-strip";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

/** Which view of the investigation is open, and how the investigation itself is running. */
export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    return (
        <header className={INVESTIGATION_HEADER_ROW}>
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

            <RuntimeStrip snapshot={snapshot} stream={stream} />
        </header>
    );
}
