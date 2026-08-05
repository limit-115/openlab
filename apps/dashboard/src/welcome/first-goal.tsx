import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "#src/design-system/button";
import { Textarea } from "#src/design-system/textarea";
import { investigationPath } from "#src/investigation-roster/investigation-address";
import {
    FORM_FAILURE,
    FORM_HINT,
    FORM_LABEL
} from "#src/investigation-roster/investigation-roster.const";
import { INVESTIGATION_ROSTER_NAMESPACE } from "#src/investigation-roster/investigation-roster.i18n";
import { createInvestigation } from "#src/investigation-roster/investigation-roster-client";
import {
    GOAL_EXAMPLE_KEYS,
    WELCOME_EXAMPLE,
    WELCOME_EXAMPLES,
    WELCOME_LEAD,
    WELCOME_TITLE
} from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { rememberIntroduction } from "#src/welcome/welcome-introduction";
import { WelcomeNavigation } from "#src/welcome/welcome-navigation";

/**
 * The end of the introduction is the lab working. Only the goal is asked for — the roster, the
 * models and the criteria all have answers the lab is already holding, and an operator who has never
 * watched a cycle has no basis for changing any of them yet.
 *
 * The examples are there to be pressed. A blank box after four screens of explanation is where a
 * setup is abandoned, and seeing what a goal looks like teaches more than a hint about one does.
 */
export function FirstGoal() {
    const { t } = useTranslation(WELCOME_NAMESPACE);
    const { t: roster } = useTranslation(INVESTIGATION_ROSTER_NAMESPACE);
    const goalId = useId();
    const navigate = useNavigate();
    const [goal, setGoal] = useState("");

    const start = useMutation({
        mutationFn: () => createInvestigation({ goal: goal.trim() }),
        onSuccess: (snapshot) => {
            rememberIntroduction();
            void navigate(investigationPath(snapshot.investigation.id), { replace: true });
        }
    });

    return (
        <>
            <h1 className={WELCOME_TITLE}>{t("goalTitle")}</h1>
            <p className={WELCOME_LEAD}>{t("goalLead")}</p>

            <div>
                <label className={FORM_LABEL} htmlFor={goalId}>
                    {roster("goalLabel")}
                </label>
                <Textarea
                    id={goalId}
                    value={goal}
                    placeholder={roster("goalPlaceholder")}
                    onChange={(event) => setGoal(event.target.value)}
                />
                <p className={FORM_HINT}>{roster("goalHint")}</p>
            </div>

            <div className={WELCOME_EXAMPLES}>
                <p className={FORM_HINT}>{t("goalExamples")}</p>
                {GOAL_EXAMPLE_KEYS.map((key) => (
                    <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={WELCOME_EXAMPLE}
                        onClick={() => setGoal(t(key))}
                    >
                        {t(key)}
                    </Button>
                ))}
            </div>

            {start.isError ? (
                <p role="alert" className={FORM_FAILURE}>
                    {t("goalFailure")}
                </p>
            ) : null}

            <WelcomeNavigation
                continueLabel={start.isPending ? t("goalStarting") : t("goalStart")}
                continueDisabled={goal.trim().length === 0 || start.isPending}
                onContinue={() => start.mutate()}
                skipLabel={t("goalLater")}
            />
        </>
    );
}
