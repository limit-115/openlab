import type { Translated } from "#src/interface-language/translation-catalog.types";

export const MISSION_OVERVIEW_NAMESPACE = "mission-overview" as const;

/**
 * How many leads are still worth watching, out of everything the director ever placed. The total is
 * what the sentence counts, because it is the noun the number agrees with in either language.
 */
export const MISSION_OVERVIEW_EN = {
    leadsLive_one: "{{live}} of {{count}} lead still live",
    leadsLive_other: "{{live}} of {{count}} leads still live",
    updated: "Updated {{at}}",
    /** Only a sleep the lab set itself a date for carries one, so it is a promise rather than a guess. */
    resumes: "Back at work {{at}}"
};

export const MISSION_OVERVIEW_RU = {
    leadsLive_one: "{{live}} из {{count}} зацепки ещё в игре",
    leadsLive_few: "{{live}} из {{count}} зацепок ещё в игре",
    leadsLive_many: "{{live}} из {{count}} зацепок ещё в игре",
    leadsLive_other: "{{live}} из {{count}} зацепок ещё в игре",
    updated: "Обновлено {{at}}",
    resumes: "Вернётся к работе {{at}}"
} satisfies Translated<typeof MISSION_OVERVIEW_EN>;
