import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { ActivityIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import { useElapsedTime } from "#src/investigation-header/elapsed-time";
import { INVESTIGATION_HEADER_NAMESPACE } from "#src/investigation-header/investigation-header.i18n";
import {
    RUNTIME_AGENT_COUNT,
    RUNTIME_ICON,
    RUNTIME_READING,
    RUNTIME_STRIP,
    RUNTIME_STRIP_VALUE
} from "#src/investigation-header/runtime-strip.const";
import { INVESTIGATION_STATE_NAMESPACE } from "#src/investigation-state/investigation-state.i18n";
import {
    STATE_DOT,
    STATE_DOT_TONE
} from "#src/investigation-state/investigation-state-display.const";
import { ConnectionBadge } from "#src/live-status/connection-badge";
import type { LiveStatus } from "#src/live-status/status-stream.types";
import { formatDuration } from "#src/value-display/duration-display";

interface RuntimeStripProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

export function RuntimeStrip({ snapshot, stream }: RuntimeStripProps) {
    const { t } = useTranslation(INVESTIGATION_HEADER_NAMESPACE);
    const { t: state } = useTranslation(INVESTIGATION_STATE_NAMESPACE);
    const uptime = useElapsedTime(
        snapshot.investigation.uptime_ms,
        snapshot.investigation.updated_at,
        snapshot.investigation.state === InvestigationState.RUNNING
    );
    const activeAgents = snapshot.runs.filter(
        (run) => run.status === AgentRunStatus.RUNNING
    ).length;

    return (
        <div className={RUNTIME_STRIP} role="status" aria-label={t("runtime")}>
            <span className={RUNTIME_READING}>
                <span
                    className={cn(STATE_DOT, STATE_DOT_TONE[snapshot.investigation.state])}
                    aria-hidden="true"
                />
                <strong className={RUNTIME_STRIP_VALUE}>
                    {state(snapshot.investigation.state)}
                </strong>
            </span>
            <span className={RUNTIME_READING}>
                <ActivityIcon className={RUNTIME_ICON} aria-hidden="true" />
                <strong className={RUNTIME_STRIP_VALUE}>{formatDuration(uptime)}</strong>
                <span className={RUNTIME_AGENT_COUNT}>
                    · {t("activeAgents", { count: activeAgents })}
                </span>
            </span>
            <ConnectionBadge stream={stream} />
        </div>
    );
}
