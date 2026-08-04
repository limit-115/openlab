import i18next from "i18next";
import { DEFAULT_LOCALE, Locale } from "#src/interface-language/interface-language.const";

/**
 * The language the interface is in right now, for everything the browser formats rather than the
 * catalogue: numbers, sizes and dates. Read at the call rather than held, because it changes while
 * the page is open, and anything rendering a formatted value redraws with the words around it.
 */
export function activeLocale(): Locale {
    return Object.values(Locale).find((locale) => locale === i18next.language) ?? DEFAULT_LOCALE;
}
