import { activeLocale } from "#src/interface-language/active-locale";
import type { Locale } from "#src/interface-language/interface-language.const";

/**
 * An `Intl` formatter for whichever language the interface is in. Building one is expensive and
 * these are read on every render, so each language keeps the formatter it was built with.
 */
export function localeFormatter<Formatter>(build: (locale: Locale) => Formatter): () => Formatter {
    const built = new Map<Locale, Formatter>();

    return () => {
        const locale = activeLocale();
        const held = built.get(locale);
        if (held !== undefined) {
            return held;
        }

        const formatter = build(locale);
        built.set(locale, formatter);
        return formatter;
    };
}
