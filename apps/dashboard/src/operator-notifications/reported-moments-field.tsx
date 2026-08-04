import type { NotifiableEventType } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "#src/design-system/checkbox";
import { cn } from "#src/design-system/class-names";
import {
    FIELD,
    FIELD_LABEL,
    MOMENT_OPTION,
    MOMENT_OPTION_CHOSEN,
    MOMENT_OPTIONS,
    NOTIFICATIONS_FAILURE,
    REPORTABLE_MOMENTS
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface ReportedMomentsFieldProps {
    moments: readonly NotifiableEventType[];
    choose: (moment: NotifiableEventType, chosen: boolean) => void;
}

/**
 * Which of the lab's moments this channel is told about. The whole row is the target rather than
 * the box in it, so a moment is chosen by clicking the sentence that describes it.
 */
export function ReportedMomentsField({ moments, choose }: ReportedMomentsFieldProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();

    return (
        <fieldset className={FIELD}>
            <legend className={FIELD_LABEL}>{t("moments")}</legend>
            <ul className={MOMENT_OPTIONS}>
                {REPORTABLE_MOMENTS.map((moment) => (
                    <li key={moment}>
                        <label
                            htmlFor={`${fieldId}-${moment}`}
                            className={cn(
                                MOMENT_OPTION,
                                moments.includes(moment) && MOMENT_OPTION_CHOSEN
                            )}
                        >
                            <Checkbox
                                id={`${fieldId}-${moment}`}
                                checked={moments.includes(moment)}
                                onCheckedChange={(chosen) => choose(moment, chosen === true)}
                            />
                            {t(moment)}
                        </label>
                    </li>
                ))}
            </ul>
            {moments.length === 0 ? (
                <p role="alert" className={NOTIFICATIONS_FAILURE}>
                    {t("momentsRequired")}
                </p>
            ) : null}
        </fieldset>
    );
}
