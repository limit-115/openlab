import { LabState } from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";
import { Bed, CircleCheckBig, CircleStop, FileText, OctagonX } from "lucide-react";
import { Panel } from "#src/components/panel";

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
            ? CircleCheckBig
            : state === LabState.HIBERNATING
              ? Bed
              : state === LabState.FAILED
                ? OctagonX
                : CircleStop;

    return (
        <Panel
            title={state === LabState.COMPLETED ? "Verified result" : `${state.toLowerCase()} lab`}
            eyebrow="Lifecycle outcome"
            icon={Icon}
            className={`outcome outcome--${state.toLowerCase()}`}
        >
            <p className="outcome__summary">
                {snapshot.result?.summary ??
                    reason ??
                    "The lab changed lifecycle state without a reason."}
            </p>
            {snapshot.result?.limitations.length ? (
                <div className="outcome__limitations">
                    <h3 className="outcome__limitations-heading">Known limitations</h3>
                    <ul>
                        {snapshot.result.limitations.map((limitation) => (
                            <li key={limitation}>{limitation}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {snapshot.result?.report_path || snapshot.result?.result_path ? (
                <ul className="artifact-links" aria-label="Result artifacts">
                    {snapshot.result.report_path ? (
                        <li>
                            <FileText size={14} aria-hidden="true" />
                            <code>{snapshot.result.report_path}</code>
                        </li>
                    ) : null}
                    {snapshot.result.result_path ? (
                        <li>
                            <FileText size={14} aria-hidden="true" />
                            <code>{snapshot.result.result_path}</code>
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </Panel>
    );
}
