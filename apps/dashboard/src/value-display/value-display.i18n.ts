import type { Translated } from "#src/interface-language/translation-catalog.types";

export const VALUE_DISPLAY_NAMESPACE = "value-display" as const;

/**
 * The units a reading is written in. They are abbreviations rather than words, because these stand
 * beside a number in a strip somebody scans rather than reads.
 */
export const VALUE_DISPLAY_EN = {
    days: "{{days}}d {{hours}}h",
    hours: "{{hours}}h {{minutes}}m",
    minutes: "{{minutes}}m {{seconds}}s",
    seconds: "{{seconds}}s",

    bytes: "bytes",
    kilobytes: "KB",
    megabytes: "MB",
    gigabytes: "GB",
    terabytes: "TB"
};

export const VALUE_DISPLAY_RU = {
    days: "{{days}} д {{hours}} ч",
    hours: "{{hours}} ч {{minutes}} м",
    minutes: "{{minutes}} м {{seconds}} с",
    seconds: "{{seconds}} с",

    bytes: "Б",
    kilobytes: "КБ",
    megabytes: "МБ",
    gigabytes: "ГБ",
    terabytes: "ТБ"
} satisfies Translated<typeof VALUE_DISPLAY_EN>;
