import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import { chooseInterfaceLanguage } from "#src/interface-language/interface-language";
import { LOCALE_LABEL, Locale } from "#src/interface-language/interface-language.const";
import { WELCOME_LANGUAGES } from "#src/welcome/welcome.const";

/**
 * The language sits on the introduction rather than behind it: everything the first screen says is
 * unreadable in a language the operator does not have, so this is a condition of reading rather
 * than a step to walk through. It is the same choice the sidebar keeps offering afterwards.
 */
export function WelcomeLanguageChoice() {
    const { i18n } = useTranslation();

    return (
        <div className={WELCOME_LANGUAGES}>
            {Object.values(Locale).map((locale) => (
                <Button
                    key={locale}
                    type="button"
                    size="sm"
                    variant={i18n.language === locale ? "secondary" : "ghost"}
                    aria-pressed={i18n.language === locale}
                    onClick={() => chooseInterfaceLanguage(locale)}
                >
                    {LOCALE_LABEL[locale]}
                </Button>
            ))}
        </div>
    );
}
