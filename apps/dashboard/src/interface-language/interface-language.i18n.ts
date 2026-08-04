import type { Translated } from "#src/interface-language/translation-catalog.types";
export const INTERFACE_LANGUAGE_NAMESPACE = "interface-language" as const;

export const INTERFACE_LANGUAGE_EN = {
    label: "Language"
};

export const INTERFACE_LANGUAGE_RU = {
    label: "Язык"
} satisfies Translated<typeof INTERFACE_LANGUAGE_EN>;
