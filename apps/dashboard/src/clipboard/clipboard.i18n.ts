import type { Translated } from "#src/interface-language/translation-catalog.types";

export const CLIPBOARD_NAMESPACE = "clipboard" as const;

export const CLIPBOARD_EN = {
    copied: "Copied"
};

export const CLIPBOARD_RU = {
    copied: "Скопировано"
} satisfies Translated<typeof CLIPBOARD_EN>;
