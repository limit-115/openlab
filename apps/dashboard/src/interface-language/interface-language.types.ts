import type { EN_TRANSLATIONS } from "#src/interface-language/translation-catalog";

/**
 * i18next resolves a key against whatever it was handed at runtime, and renders the key itself when
 * it finds nothing. Handing the compiler the same shape turns that into a build failure instead, so
 * a key nobody wrote cannot reach the page. English is the source, so it is what the types measure.
 */
declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: false;
        resources: typeof EN_TRANSLATIONS;
    }
}
