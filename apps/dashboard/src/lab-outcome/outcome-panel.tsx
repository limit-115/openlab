import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import {
    BedIcon,
    CircleCheckBigIcon,
    CircleStopIcon,
    FileTextIcon,
    OctagonXIcon
} from "lucide-react";
import {
    ARTIFACT_LINK,
    ARTIFACT_LINKS,
    OUTCOME_LIMITATIONS_HEADING,
    OUTCOME_LIMITATIONS_LIST,
    OUTCOME_SUMMARY,
    OUTCOME_SURFACE
} from "#src/lab-outcome/outcome-panel.const";
import { Panel } from "#src/panel/panel";

interface OutcomePanelProps {
    snapshot: StatusSnapshot;
}

export function OutcomePanel({ snapshot }: OutcomePanelProps) {
    const { state, reason } = snapshot.lab;
    const shouldShow =
        snapshot.result ||
        state === LabState.HIBERNATING ||
        state === LabState.COMPLETED ||
        state === LabState.FAILED ||
        state === LabState.STOPPED;

    if (!shouldShow) {
        return null;
    }

    const Icon =
        state === LabState.COMPLETED
            ? CircleCheckBigIcon
            : state === LabState.HIBERNATING
              ? BedIcon
              : state === LabState.FAILED
                ? OctagonXIcon
                : CircleStopIcon;

    return (
        <Panel
            title={state === LabState.COMPLETED ? "Verified result" : `${state.toLowerCase()} lab`}
            description="Lifecycle outcome"
            icon={Icon}
            className={OUTCOME_SURFACE[state]}
        >
            <p className={OUTCOME_SUMMARY}>
                {snapshot.result?.summary ??
                    reason ??
                    "The lab changed lifecycle state without a reason."}
            </p>
            {snapshot.result?.limitations.length ? (
                <div className="mt-6">
                    <h3 className={OUTCOME_LIMITATIONS_HEADING}>Known limitations</h3>
                    <ul className={OUTCOME_LIMITATIONS_LIST}>
                        {snapshot.result.limitations.map((limitation) => (
                            <li key={limitation}>{limitation}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {snapshot.result?.report_path || snapshot.result?.result_path ? (
                <ul className={ARTIFACT_LINKS} aria-label="Result artifacts">
                    {snapshot.result.report_path ? (
                        <li className={ARTIFACT_LINK}>
                            <FileTextIcon className="size-4 flex-none" aria-hidden="true" />
                            {snapshot.result.report_path}
                        </li>
                    ) : null}
                    {snapshot.result.result_path ? (
                        <li className={ARTIFACT_LINK}>
                            <FileTextIcon className="size-4 flex-none" aria-hidden="true" />
                            {snapshot.result.result_path}
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </Panel>
    );
}
