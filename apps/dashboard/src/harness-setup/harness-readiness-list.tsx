import { HarnessReadinessState } from "@nightlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadinessRoster } from "@nightlab/protocol/harness-readiness/harness-readiness.types";
import { useTranslation } from "react-i18next";
import { Spinner } from "#src/design-system/spinner";
import { HarnessReadinessCard } from "#src/harness-setup/harness-readiness-card";
import {
    HARNESS_CARD_ERROR,
    HARNESS_LIST,
    HARNESS_SETUP_PENDING
} from "#src/harness-setup/harness-setup.const";
import { HARNESS_SETUP_NAMESPACE } from "#src/harness-setup/harness-setup.i18n";

/** Whether anything on this machine could take a research bet right now. */
export function hasReadyHarness(roster: HarnessReadinessRoster | undefined): boolean {
    return roster?.some(({ state }) => state === HarnessReadinessState.READY) ?? false;
}

/**
 * Whether there is anything left to watch for. Each check launches every CLI on the machine, which
 * is worth doing while a card might still turn over and worth nothing once none of them can.
 */
export function everyHarnessReady(roster: HarnessReadinessRoster | undefined): boolean {
    return roster?.every(({ state }) => state === HarnessReadinessState.READY) ?? false;
}

interface HarnessReadinessListProps {
    /** Absent while the CLIs have not answered yet, which is a state of its own and not an empty list. */
    harnesses: HarnessReadinessRoster | undefined;
    /** The lab itself could not be asked, which is a different failure from a harness refusing. */
    unreachable: boolean;
}

/**
 * Every harness the lab can run, as it stands on this machine right now. Nothing is hidden once it
 * is ready: an operator who set one up an hour ago comes back to a list that still names it, rather
 * than to a shorter list they have to reconstruct.
 */
export function HarnessReadinessList({ harnesses, unreachable }: HarnessReadinessListProps) {
    const { t } = useTranslation(HARNESS_SETUP_NAMESPACE);

    if (harnesses === undefined) {
        return unreachable ? (
            <p className={HARNESS_CARD_ERROR}>{t("unreachable")}</p>
        ) : (
            <p className={HARNESS_SETUP_PENDING}>
                <Spinner />
                {t("checking")}
            </p>
        );
    }

    return (
        <ul className={HARNESS_LIST} aria-label={t("title")}>
            {harnesses.map((harness) => (
                <HarnessReadinessCard key={harness.harness} harness={harness} />
            ))}
        </ul>
    );
}
