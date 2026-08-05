import { useTranslation } from "react-i18next";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "#src/design-system/select";
import { chooseInterfaceLanguage } from "#src/interface-language/interface-language";
import {
    INTERFACE_LANGUAGE_TRIGGER,
    LOCALE_LABEL,
    Locale
} from "#src/interface-language/interface-language.const";
import { INTERFACE_LANGUAGE_NAMESPACE } from "#src/interface-language/interface-language.i18n";

/**
 * The language the dashboard is written in, wherever a page offers it as a setting rather than as an
 * address in the sidebar. One language is in force and the rest are a list to be gone through, which
 * is what a select says: laying them all out at once spends a row on a decision that is made once.
 */
export function InterfaceLanguageSelect() {
    const { t, i18n } = useTranslation(INTERFACE_LANGUAGE_NAMESPACE);

    return (
        <Select
            value={i18n.language}
            onValueChange={(chosen) => {
                if (isLocale(chosen)) {
                    chooseInterfaceLanguage(chosen);
                }
            }}
        >
            <SelectTrigger className={INTERFACE_LANGUAGE_TRIGGER} aria-label={t("label")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {/* The registry pads the group rather than the popover, so items need one. */}
                <SelectGroup>
                    {Object.values(Locale).map((locale) => (
                        <SelectItem key={locale} value={locale}>
                            {LOCALE_LABEL[locale]}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

function isLocale(value: string): value is Locale {
    return Object.values(Locale).includes(value as Locale);
}
