import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    FIELD,
    FIELD_HINT,
    FIELD_LABEL,
    LANGUAGE_OPTION,
    MESSAGE_LANGUAGES
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface MessageLanguageFieldProps {
    language: NotificationLanguage;
    choose: (language: NotificationLanguage) => void;
}

/**
 * What language the lab writes to this channel in. It is set here rather than taken from the page,
 * because the page's language is a preference of whoever is looking at it and a message goes to
 * somebody who may have nothing open at all.
 */
export function MessageLanguageField({ language, choose }: MessageLanguageFieldProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();

    return (
        <div className={FIELD}>
            <span id={fieldId} className={FIELD_LABEL}>
                {t("language")}
            </span>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={language}
                aria-labelledby={fieldId}
                onValueChange={(chosen) => {
                    if (isMessageLanguage(chosen)) {
                        choose(chosen);
                    }
                }}
            >
                {MESSAGE_LANGUAGES.map((option) => (
                    <ToggleGroupItem
                        key={option}
                        value={option}
                        aria-label={t(option)}
                        className={LANGUAGE_OPTION}
                    >
                        {t(option)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <p className={FIELD_HINT}>{t("languageHint")}</p>
        </div>
    );
}

function isMessageLanguage(value: string): value is NotificationLanguage {
    return Object.values(NotificationLanguage).includes(value as NotificationLanguage);
}
