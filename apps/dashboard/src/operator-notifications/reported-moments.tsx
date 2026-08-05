import type { NotifiableEventType } from "@openlab/protocol/operator-notifications/notifiable-event.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "#src/design-system/checkbox";
import { cn } from "#src/design-system/class-names";
import {
    FOLLOWED_MOMENTS,
    MOMENT_OPTION,
    MOMENT_OPTION_CHOSEN,
    MOMENT_OPTIONS,
    NOTIFICATIONS_FAILURE,
    REPORTABLE_MOMENTS
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface ReportedMomentsOptionsProps {
    moments: readonly NotifiableEventType[];
    choose: (moment: NotifiableEventType, chosen: boolean) => void;
}

/**
 * Which of the lab's moments are reported. The whole row is the target rather than the box in it,
 * so a moment is chosen by clicking the sentence that describes it.
 */
export function ReportedMomentsOptions({ moments, choose }: ReportedMomentsOptionsProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();

    return (
        <>
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
        </>
    );
}

/**
 * The moments a channel is being told about by the lab rather than by itself. They are listed in
 * full rather than counted: the operator is reading them to decide whether to disagree, and a
 * channel that would go quiet about something has to be able to say so before it does. It reads as
 * a list rather than as ticks, because a tick is what the control it replaces uses.
 */
export function FollowedMoments({ moments }: { moments: readonly NotifiableEventType[] }) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);

    return (
        <ul className={FOLLOWED_MOMENTS}>
            {moments.map((moment) => (
                <li key={moment}>{t(moment)}</li>
            ))}
        </ul>
    );
}
