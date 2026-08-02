import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { FlaskConicalIcon } from "lucide-react";
import { PAGE_FRAME } from "#src/app.const";
import { cn } from "#src/design-system/class-names";
import { LAB_HEADER_BAR, LAB_HEADER_ROW } from "#src/lab-header/lab-header.const";
import { RuntimeStrip } from "#src/lab-header/runtime-strip";
import { SectionNav } from "#src/lab-header/section-nav";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface LabHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
    /** The section anchors only lead anywhere while the overview is the view being shown. */
    showSections: boolean;
}

export function LabHeader({ snapshot, stream, showSections }: LabHeaderProps) {
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

                {showSections ? <SectionNav /> : null}

                <RuntimeStrip snapshot={snapshot} stream={stream} />
            </div>
        </header>
    );
}
