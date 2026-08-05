import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    fetchHarnessReadiness,
    harnessReadinessQueryKey
} from "#src/harness-setup/harness-readiness-client";
import { HarnessReadinessList, hasReadyHarness } from "#src/harness-setup/harness-readiness-list";
import {
    HARNESS_CHECK_INTERVAL_MS,
    HARNESS_SETUP_NOTE,
    HARNESS_SETUP_WARNING
} from "#src/harness-setup/harness-setup.const";
import { HARNESS_SETUP_NAMESPACE } from "#src/harness-setup/harness-setup.i18n";
import { WELCOME_LEAD, WELCOME_ROLE_WORK, WELCOME_TITLE } from "#src/welcome/welcome.const";
import { WelcomeNavigation } from "#src/welcome/welcome-navigation";

/**
 * The hard step, and the only one the lab cannot do for the operator: the CLIs it researches through
 * are signed in to subscriptions that are theirs, on a machine that is theirs. What the lab can do is
 * find out where each one stands and ask for exactly one thing at a time.
 *
 * The page keeps asking while it is open, so the operator installs in another window and watches the
 * card turn over rather than reporting back to the page that it worked.
 */
export function HarnessSetupStep() {
    const { t } = useTranslation(HARNESS_SETUP_NAMESPACE);
    const harnesses = useQuery({
        queryKey: harnessReadinessQueryKey,
        queryFn: ({ signal }) => fetchHarnessReadiness(signal),
        retry: false,
        refetchInterval: HARNESS_CHECK_INTERVAL_MS,
        refetchOnWindowFocus: true
    });
    const ready = hasReadyHarness(harnesses.data);

    return (
        <>
            <h1 className={WELCOME_TITLE}>{t("title")}</h1>
            <p className={WELCOME_LEAD}>{t("lead")}</p>
            <p className={HARNESS_SETUP_WARNING}>{t("noKeys")}</p>

            <HarnessReadinessList harnesses={harnesses.data} unreachable={harnesses.isError} />

            <p className={HARNESS_SETUP_NOTE}>{t("enough")}</p>
            <p className={WELCOME_ROLE_WORK}>{t("watching")}</p>

            <WelcomeNavigation continueDisabled={!ready}>
                {ready ? null : <p className={HARNESS_SETUP_NOTE}>{t("blocked")}</p>}
            </WelcomeNavigation>
        </>
    );
}
