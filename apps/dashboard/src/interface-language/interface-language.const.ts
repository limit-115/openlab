/**
 * The two languages the interface is written in. English is the one the copy is authored in, so it
 * is also what a missing translation falls back to rather than showing the operator a bare key.
 */
export const Locale = {
    EN: "en",
    RU: "ru"
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const DEFAULT_LOCALE: Locale = Locale.EN;

export const LOCALE_STORAGE_KEY = "lab-ui-language" as const;

/**
 * Each language names itself. A language the operator cannot read yet is no use introducing in the
 * one they are currently looking at, so these two labels stay the same whichever language is on.
 */
export const LOCALE_LABEL: Record<Locale, string> = {
    [Locale.EN]: "English",
    [Locale.RU]: "Русский"
};

/** Wide enough to hold the longest language name, so choosing one does not resize the row. */
export const INTERFACE_LANGUAGE_TRIGGER = "min-w-36" as const;
