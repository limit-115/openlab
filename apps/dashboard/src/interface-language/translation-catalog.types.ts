/**
 * One language's answer to the English source. Every key the source writes has to be answered, so
 * a word nobody translated fails the build rather than quietly falling back. A language may also
 * add keys of its own: English says a number two ways and Russian says it four, so a translation
 * carries plural forms the source has no use for.
 */
export type Translated<Source> = Source & Record<string, string>;
