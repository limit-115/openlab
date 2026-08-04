import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import {
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    Locale
} from "#src/interface-language/interface-language.const";
import { EN_TRANSLATIONS, RU_TRANSLATIONS } from "#src/interface-language/translation-catalog";

/** Anything held over from an older build that is no longer one of the languages falls back. */
function storedLocale(): Locale | undefined {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

    return Object.values(Locale).find((locale) => locale === stored);
}

/**
 * Until the operator says otherwise the machine decides, in the order it ranks its own languages,
 * so a browser asking for Russian first opens the dashboard in Russian without anyone clicking.
 */
function machineLocale(): Locale {
    for (const tag of navigator.languages ?? [navigator.language]) {
        const spoken = Object.values(Locale).find((locale) => tag.startsWith(locale));

        if (spoken) {
            return spoken;
        }
    }

    return DEFAULT_LOCALE;
}

/** Screen readers and the browser's own spell checking read this, not the language menu. */
i18next.on("languageChanged", (language) => {
    document.documentElement.lang = language;
});

void i18next.use(initReactI18next).init({
    lng: storedLocale() ?? machineLocale(),
    fallbackLng: DEFAULT_LOCALE,
    // Every feature asks for its own namespace by name, so there is no sensible default to guess.
    defaultNS: false,
    resources: {
        [Locale.EN]: EN_TRANSLATIONS,
        [Locale.RU]: RU_TRANSLATIONS
    },
    // React escapes what it renders, and doing it twice turns an apostrophe into markup.
    interpolation: { escapeValue: false }
});

/** The standing choice, kept for the next visit rather than only for the open page. */
export function chooseInterfaceLanguage(locale: Locale) {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);

    void i18next.changeLanguage(locale);
}
