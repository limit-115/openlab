import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { FlaskConical } from "lucide-react";
import { BRAND, BRAND_ID, BRAND_MARK, BRAND_NAME, TOPBAR } from "#src/lab-header/lab-header.const";
import { RuntimeStrip } from "#src/lab-header/runtime-strip";
import { SectionNav } from "#src/lab-header/section-nav";
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { formatIdentifier } from "#src/value-display/identifier-display";

interface LabHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

export function LabHeader({ snapshot, stream }: LabHeaderProps) {
    return (
        <header className={TOPBAR}>
            <div className={BRAND}>
                <span className={BRAND_MARK} aria-hidden="true">
                    <FlaskConical size={21} strokeWidth={1.8} />
                </span>
                <div>
                    <p className={BRAND_NAME}>Research Lab</p>
                    <p className={BRAND_ID} title={snapshot.lab.id}>
                        {formatIdentifier(snapshot.lab.id)}
                    </p>
                </div>
            </div>

            <SectionNav />

            <RuntimeStrip snapshot={snapshot} stream={stream} />
        </header>
    );
}
