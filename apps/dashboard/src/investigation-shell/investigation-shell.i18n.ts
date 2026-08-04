import type { Translated } from "#src/interface-language/translation-catalog.types";

export const INVESTIGATION_SHELL_NAMESPACE = "investigation-shell" as const;

/** Shown when the daemon answered without the snapshot the whole page is built out of. */
export const INVESTIGATION_SHELL_EN = {
    missingSnapshot: "The local runtime did not return a status snapshot."
};

export const INVESTIGATION_SHELL_RU = {
    missingSnapshot: "Локальная среда не вернула снимок состояния."
} satisfies Translated<typeof INVESTIGATION_SHELL_EN>;
