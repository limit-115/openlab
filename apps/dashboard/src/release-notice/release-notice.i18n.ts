import type { Translated } from "#src/interface-language/translation-catalog.types";

export const RELEASE_NOTICE_NAMESPACE = "release-notice" as const;

/**
 * What the sidebar says about a release the lab does not have. The version is put in by whoever
 * renders it, because a sentence that names it reads better than a sentence beside it.
 */
export const RELEASE_NOTICE_EN = {
    available: "{{version}} is out",
    command: "Install it with openlab update"
};

export const RELEASE_NOTICE_RU = {
    available: "Вышла {{version}}",
    command: "Установить: openlab update"
} satisfies Translated<typeof RELEASE_NOTICE_EN>;
