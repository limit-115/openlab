import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { FileTextIcon, TrophyIcon } from "lucide-react";
import {
    BREAKTHROUGH_BANNER,
    BREAKTHROUGH_CLAIM,
    BREAKTHROUGH_EYEBROW,
    BREAKTHROUGH_FILE,
    BREAKTHROUGH_FILES,
    BREAKTHROUGH_NOTE,
    BREAKTHROUGH_PROSE,
    BREAKTHROUGH_SECTION_LABEL,
    BREAKTHROUGH_TITLE
} from "#src/breakthrough/breakthrough-banner.const";

interface BreakthroughBannerProps {
    snapshot: StatusSnapshot;
}

/** Shown only once a verifier confirmed a finding, which is the whole point of the run. */
export function BreakthroughBanner({ snapshot }: BreakthroughBannerProps) {
    const finding = snapshot.findings.find(({ id }) => id === snapshot.breakthrough_finding_id);
    if (finding === undefined) {
        return null;
    }
    const verdict = snapshot.verdicts.find(({ finding_id }) => finding_id === finding.id);
    const files = [snapshot.result?.report_path, snapshot.result?.result_path].filter(
        (candidate): candidate is string => candidate !== undefined
    );

    return (
        <section className={BREAKTHROUGH_BANNER} aria-labelledby="breakthrough-heading">
            <p className={BREAKTHROUGH_EYEBROW}>
                <TrophyIcon className="size-5 flex-none" aria-hidden="true" />
                {BREAKTHROUGH_TITLE}
            </p>
            <h2 id="breakthrough-heading" className={BREAKTHROUGH_CLAIM}>
                {finding.claim}
            </h2>
            <p className={BREAKTHROUGH_PROSE}>{BREAKTHROUGH_NOTE}</p>

            {verdict ? (
                <div>
                    <h3 className={BREAKTHROUGH_SECTION_LABEL}>What the verifier did</h3>
                    <p className={BREAKTHROUGH_PROSE}>{verdict.reasoning}</p>
                </div>
            ) : null}

            <div>
                <h3 className={BREAKTHROUGH_SECTION_LABEL}>How the researcher got there</h3>
                <p className={BREAKTHROUGH_PROSE}>{finding.work}</p>
            </div>

            {files.length > 0 ? (
                <ul className={BREAKTHROUGH_FILES} aria-label="Result files">
                    {files.map((file) => (
                        <li key={file} className={BREAKTHROUGH_FILE}>
                            <FileTextIcon className="size-4 flex-none" aria-hidden="true" />
                            {file}
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
