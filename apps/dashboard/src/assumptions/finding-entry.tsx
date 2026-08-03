import type { Finding } from "@lab/protocol/findings/finding.types";
import type { Verdict } from "@lab/protocol/verdicts/verdict.types";
import { ChevronRightIcon } from "lucide-react";
import {
    FINDING_ARTIFACTS,
    FINDING_CLAIM,
    FINDING_DISCLOSURE,
    FINDING_DISCLOSURE_BODY,
    FINDING_DISCLOSURE_CHEVRON,
    FINDING_ENTRY,
    FINDING_PROSE,
    FINDING_SECTION_LABEL,
    VERDICT_LABEL
} from "#src/assumptions/assumption-card.const";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "#src/design-system/collapsible";
import { StatusTag } from "#src/status-tag/status-tag";

interface FindingEntryProps {
    finding: Finding;
    verdict: Verdict | undefined;
}

/**
 * What a researcher claimed, and what the verifier made of it. Both are prose somebody has to read
 * in full, so the disclosure holds them whole rather than trimming either to a preview.
 */
export function FindingEntry({ finding, verdict }: FindingEntryProps) {
    return (
        <Collapsible asChild>
            <li className={`${FINDING_ENTRY} group/finding`}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <strong className={FINDING_CLAIM}>{finding.claim}</strong>
                    <StatusTag status={finding.status} />
                </div>

                <CollapsibleTrigger className={FINDING_DISCLOSURE}>
                    <ChevronRightIcon className={FINDING_DISCLOSURE_CHEVRON} aria-hidden="true" />
                    {verdictSummary(verdict)}
                </CollapsibleTrigger>
                <CollapsibleContent className={FINDING_DISCLOSURE_BODY}>
                    <div>
                        <h4 className={FINDING_SECTION_LABEL}>How the researcher got there</h4>
                        <p className={FINDING_PROSE}>{finding.work}</p>
                    </div>
                    {verdict ? (
                        <div>
                            <h4 className={FINDING_SECTION_LABEL}>What the verifier did</h4>
                            <p className={FINDING_PROSE}>{verdict.reasoning}</p>
                        </div>
                    ) : null}
                    {finding.artifact_paths.length > 0 ? (
                        <div>
                            <h4 className={FINDING_SECTION_LABEL}>Files it left behind</h4>
                            <ul className={FINDING_ARTIFACTS}>
                                {finding.artifact_paths.map((artifactPath) => (
                                    <li key={artifactPath}>{artifactPath}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </CollapsibleContent>
            </li>
        </Collapsible>
    );
}

function verdictSummary(verdict: Verdict | undefined): string {
    if (verdict === undefined) {
        return VERDICT_LABEL.PENDING;
    }
    return verdict.confirmed ? VERDICT_LABEL.CONFIRMED : VERDICT_LABEL.REFUTED;
}
