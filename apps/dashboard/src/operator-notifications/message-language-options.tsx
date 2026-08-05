import { NotificationLanguage } from "@openlab/protocol/operator-notifications/notification-channel.const";
import { useTranslation } from "react-i18next";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "#src/design-system/select";
import {
    LANGUAGE_TRIGGER,
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
 *
 * One language is in force at a time and the rest are a list to be gone through, which is what a
 * select says; laying every language out at once would spend a row of the panel on a decision that
 * is read far more often than it is changed.
 */
export function MessageLanguageOptions({ language, choose }: MessageLanguageOptionsProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);

    return (
        <Select
            value={language}
            onValueChange={(chosen) => {
                if (isMessageLanguage(chosen)) {
                    choose(chosen);
                }
            }}
        >
            <SelectTrigger className={LANGUAGE_TRIGGER} aria-label={t("language")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {/* The registry pads the group rather than the popover, so items need one. */}
                <SelectGroup>
                    {MESSAGE_LANGUAGES.map((option) => (
                        <SelectItem key={option} value={option}>
                            {t(option)}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

function isMessageLanguage(value: string): value is NotificationLanguage {
    return Object.values(NotificationLanguage).includes(value as NotificationLanguage);
}
