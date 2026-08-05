import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#src/design-system/card";
import { MessageLanguageOptions } from "#src/operator-notifications/message-language-options";
import { NotificationField } from "#src/operator-notifications/notification-field";
import {
    changeDefaults,
    chooseLabMoment
} from "#src/operator-notifications/notification-settings-draft";
import { SHARED_SETTINGS_CONTENT } from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";
import type { NotificationSettingsDraft } from "#src/operator-notifications/operator-notifications.types";
import { ReportedMomentsOptions } from "#src/operator-notifications/reported-moments";

interface SharedReportSettingsProps {
    draft: NotificationSettingsDraft;
    change: (next: NotificationSettingsDraft) => void;
}

/**
 * What the lab reports, and in what language, wherever it has not been told otherwise. This is the
 * page's opening statement rather than a channel of its own: an operator with one recipient never
 * has to read past it, and one with several answers here what they would otherwise repeat.
 */
export function SharedReportSettings({ draft, change }: SharedReportSettingsProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sharedTitle")}</CardTitle>
                <CardDescription>{t("sharedDescription")}</CardDescription>
            </CardHeader>

            <CardContent className={SHARED_SETTINGS_CONTENT}>
                <NotificationField label={t("moments")}>
                    <ReportedMomentsOptions
                        moments={draft.defaults.events}
                        choose={(moment, chosen) => change(chooseLabMoment(draft, moment, chosen))}
                    />
                </NotificationField>

                <NotificationField label={t("language")} hint={t("languageHint")}>
                    <MessageLanguageOptions
                        language={draft.defaults.language}
                        choose={(language) => change(changeDefaults(draft, { language }))}
                    />
                </NotificationField>
            </CardContent>
        </Card>
    );
}
