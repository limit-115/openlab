import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { Button } from "#src/design-system/button";
import {
    WELCOME_ACTIONS,
    WELCOME_CYCLE,
    WELCOME_HEADER,
    WELCOME_LEAD,
    WELCOME_OUTCOME,
    WELCOME_ROLE,
    WELCOME_ROLE_NAME,
    WELCOME_ROLE_WORK,
    WELCOME_SCREEN,
    WELCOME_TITLE
} from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { rememberIntroduction } from "#src/welcome/welcome-introduction";
import { WelcomeLanguageChoice } from "#src/welcome/welcome-language-choice";

/**
 * What the lab is, before anything is asked of the operator. The cycle is described in the lab's
 * own nouns, because they are the ones every page after this is written in: a page that teaches
 * different words to the ones on screen has taught nothing.
 *
 * Both ways off this screen agree it has been read, so nobody is shown it twice for having decided
 * they did not need it.
 */
export function WelcomeView() {
    const { t } = useTranslation(WELCOME_NAMESPACE);
    const navigate = useNavigate();

    const leave = () => {
        rememberIntroduction();
        void navigate(LabRoute.ROSTER, { replace: true });
    };

    return (
        <div className={WELCOME_SCREEN}>
            <header className={WELCOME_HEADER}>
                <h1 className={WELCOME_TITLE}>{t("title")}</h1>
                <WelcomeLanguageChoice />
            </header>

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

            <div className={WELCOME_ACTIONS}>
                <Button type="button" onClick={leave}>
                    {t("continue")}
                </Button>
                <Button type="button" variant="ghost" onClick={leave}>
                    {t("skip")}
                </Button>
            </div>
        </div>
    );
}
