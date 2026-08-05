import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { InterfaceLanguageSelect } from "#src/interface-language/interface-language-select";
import { ThemeSelect } from "#src/theme/theme-select";
import {
    WELCOME_CHROME,
    WELCOME_PROGRESS,
    WELCOME_SCREEN,
    WELCOME_SETTINGS
} from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { WELCOME_STEPS, type WelcomeStep } from "#src/welcome/welcome-steps.const";

/**
 * What every step of the introduction stands in: how far along it is, and the two choices that
 * decide how the rest of it reads. Saying which step of how many is the whole of what makes a setup
 * feel finishable — an operator who cannot see the end of it reads the second screen as the start of
 * an unknown number of them.
 *
 * The language and the palette are settings rather than steps: both are conditions of reading the
 * introduction at all, and neither is work the operator came here to do.
 */
export function WelcomeLayout() {
    const { t } = useTranslation(WELCOME_NAMESPACE);
    const step = currentStepNumber(useLocation().pathname);

    return (
        <div className={WELCOME_SCREEN}>
            <div className={WELCOME_CHROME}>
                <p className={WELCOME_PROGRESS}>
                    {t("progress", { step, total: WELCOME_STEPS.length })}
                </p>
                <div className={WELCOME_SETTINGS}>
                    <InterfaceLanguageSelect />
                    <ThemeSelect />
                </div>
            </div>

            <Outlet />
        </div>
    );
}

/** Counted from one, and from the first step for an address the wizard does not know. */
function currentStepNumber(pathname: string): number {
    const index = WELCOME_STEPS.indexOf(pathname as WelcomeStep);
    return index < 0 ? 1 : index + 1;
}
