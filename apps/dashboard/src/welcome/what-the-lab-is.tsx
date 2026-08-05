import { useTranslation } from "react-i18next";
import { OpenLabLockup } from "#src/brand/openlab-lockup";
import {
    WELCOME_CYCLE,
    WELCOME_HEADING,
    WELCOME_LEAD,
    WELCOME_OUTCOME,
    WELCOME_ROLE,
    WELCOME_ROLE_NAME,
    WELCOME_ROLE_WORK,
    WELCOME_TITLE
} from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { WelcomeNavigation } from "#src/welcome/welcome-navigation";

/**
 * What the lab is, before anything is asked of the operator. The cycle is described in the lab's
 * own nouns, because they are the ones every page after this is written in: a page that teaches
 * different words to the ones on screen has taught nothing.
 */
export function WhatTheLabIs() {
    const { t } = useTranslation(WELCOME_NAMESPACE);

    return (
        <>
            <div className={WELCOME_HEADING}>
                <OpenLabLockup />
                <h1 className={WELCOME_TITLE}>{t("title")}</h1>
            </div>
            <p className={WELCOME_LEAD}>{t("lead")}</p>

            <div className={WELCOME_CYCLE}>
                <p className={WELCOME_ROLE}>
                    <span className={WELCOME_ROLE_NAME}>{t("director")}</span>
                    <span className={WELCOME_ROLE_WORK}>{t("directorWork")}</span>
                </p>
                <p className={WELCOME_ROLE}>
                    <span className={WELCOME_ROLE_NAME}>{t("researcher")}</span>
                    <span className={WELCOME_ROLE_WORK}>{t("researcherWork")}</span>
                </p>
                <p className={WELCOME_ROLE}>
                    <span className={WELCOME_ROLE_NAME}>{t("verifier")}</span>
                    <span className={WELCOME_ROLE_WORK}>{t("verifierWork")}</span>
                </p>
            </div>

            <p className={WELCOME_OUTCOME}>{t("outcome")}</p>
            <p className={WELCOME_ROLE_WORK}>{t("hours")}</p>

            <WelcomeNavigation continueLabel={t("setUp")} />
        </>
    );
}
