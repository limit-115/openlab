import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    LANGUAGE_OPTION,
    MESSAGE_LANGUAGES
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface MessageLanguageOptionsProps {
    language: NotificationLanguage;
    choose: (language: NotificationLanguage) => void;
}

/**
 * What language the lab writes in. It is set here rather than taken from the page, because the
 * page's language is a preference of whoever is looking at it and a message goes to somebody who
 * may have nothing open at all.
 */
export function MessageLanguageOptions({ language, choose }: MessageLanguageOptionsProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);

    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={language}
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
    );
}

function isMessageLanguage(value: string): value is NotificationLanguage {
    return Object.values(NotificationLanguage).includes(value as NotificationLanguage);
}
