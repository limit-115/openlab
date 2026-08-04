import {
    INTERFACE_LANGUAGE_EN,
    INTERFACE_LANGUAGE_NAMESPACE,
    INTERFACE_LANGUAGE_RU
} from "#src/interface-language/interface-language.i18n";
import {
    STATUS_TAG_EN,
    STATUS_TAG_NAMESPACE,
    STATUS_TAG_RU
} from "#src/status-tag/status-tag.i18n";

/**
 * Every feature keeps its own words beside the code that renders them, under a namespace named
 * after the feature. This is the one place that knows the whole vocabulary, because i18next has to
 * be handed a single object per language, and it is a list of features rather than a store of copy.
 */
export const EN_TRANSLATIONS = {
    [INTERFACE_LANGUAGE_NAMESPACE]: INTERFACE_LANGUAGE_EN,
    [STATUS_TAG_NAMESPACE]: STATUS_TAG_EN
};

/** Measured against the English source, so a namespace nobody translated fails the build. */
export const RU_TRANSLATIONS = {
    [INTERFACE_LANGUAGE_NAMESPACE]: INTERFACE_LANGUAGE_RU,
    [STATUS_TAG_NAMESPACE]: STATUS_TAG_RU
} satisfies typeof EN_TRANSLATIONS;
