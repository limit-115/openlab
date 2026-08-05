import type { Finding } from "@nightlab/protocol/findings/finding.types";
import type { Verdict } from "@nightlab/protocol/verdicts/verdict.types";
import { ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    FINDING_ARTIFACTS,
    FINDING_CLAIM,
    FINDING_DISCLOSURE,
    FINDING_DISCLOSURE_BODY,
    FINDING_DISCLOSURE_CHEVRON,
    FINDING_ENTRY,
    FINDING_PROSE,
    FINDING_SECTION_LABEL
} from "#src/assumptions/assumption-card.const";
import { type ASSUMPTIONS_EN, ASSUMPTIONS_NAMESPACE } from "#src/assumptions/assumptions.i18n";
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
    const { t } = useTranslation(ASSUMPTIONS_NAMESPACE);

    return (
        <Collapsible asChild>
            <li className={`${FINDING_ENTRY} group/finding`}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <strong className={FINDING_CLAIM}>{finding.claim}</strong>
                    <StatusTag status={finding.status} />
                </div>

                <CollapsibleTrigger className={FINDING_DISCLOSURE}>
                    <ChevronRightIcon className={FINDING_DISCLOSURE_CHEVRON} aria-hidden="true" />
                    {t(verdictSummary(verdict))}
                </CollapsibleTrigger>
                <CollapsibleContent className={FINDING_DISCLOSURE_BODY}>
                    <div>
                        <h4 className={FINDING_SECTION_LABEL}>{t("researcher")}</h4>
                        <p className={FINDING_PROSE}>{finding.work}</p>
                    </div>
                    {verdict ? (
                        <div>
                            <h4 className={FINDING_SECTION_LABEL}>{t("verifier")}</h4>
                            <p className={FINDING_PROSE}>{verdict.reasoning}</p>
                        </div>
                    ) : null}
                    {finding.artifact_paths.length > 0 ? (
                        <div>
                            <h4 className={FINDING_SECTION_LABEL}>{t("artifacts")}</h4>
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

/** Which of the three things the disclosure has to say, before it is said in any language. */
function verdictSummary(verdict: Verdict | undefined): keyof typeof ASSUMPTIONS_EN {
    if (verdict === undefined) {
        return "verdictPending";
    }
    return verdict.confirmed ? "verdictConfirmed" : "verdictRefuted";
}
