import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { Button } from "#src/design-system/button";
import { WELCOME_ACTIONS, WELCOME_SKIP } from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { rememberIntroduction } from "#src/welcome/welcome-introduction";
import { WELCOME_STEPS, type WelcomeStep } from "#src/welcome/welcome-steps.const";

interface WelcomeNavigationProps {
    /** What the step calls going on, when "Continue" is not the honest word for what it does. */
    continueLabel?: string;
    /** A step that has somewhere of its own to send the operator says so; the rest walk in order. */
    onContinue?: () => void;
    continueDisabled?: boolean;
    /** What leaving is called on a step where "skip the setup" is no longer the honest word. */
    skipLabel?: string;
    /** What this step wants said beside its buttons, such as why continuing is not possible yet. */
    children?: ReactNode;
}

/**
 * The way off every step. Leaving the introduction counts as having read it however it is left:
 * deciding the setup is not needed is an answer, and asking again tomorrow ignores it.
 */
export function WelcomeNavigation({
    continueLabel,
    onContinue,
    continueDisabled = false,
    skipLabel,
    children
}: WelcomeNavigationProps) {
    const { t } = useTranslation(WELCOME_NAMESPACE);
    const navigate = useNavigate();
    const step = WELCOME_STEPS.indexOf(useLocation().pathname as WelcomeStep);
    const previous = step > 0 ? WELCOME_STEPS[step - 1] : undefined;
    const next = WELCOME_STEPS[step + 1];

    const leave = () => {
        rememberIntroduction();
        void navigate(LabRoute.ROSTER, { replace: true });
    };

    const goOn = onContinue ?? (next === undefined ? leave : () => void navigate(next));

    return (
        <div className={WELCOME_ACTIONS}>
            {previous === undefined ? null : (
                <Button type="button" variant="outline" onClick={() => void navigate(previous)}>
                    {t("back")}
                </Button>
            )}
            <Button type="button" disabled={continueDisabled} onClick={goOn}>
                {continueLabel ?? t("continue")}
            </Button>
            {children}
            <Button type="button" variant="ghost" className={WELCOME_SKIP} onClick={leave}>
                {skipLabel ?? t("skip")}
            </Button>
        </div>
    );
}
