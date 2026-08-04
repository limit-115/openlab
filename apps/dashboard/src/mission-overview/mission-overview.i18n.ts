import type { Translated } from "#src/interface-language/translation-catalog.types";

export const MISSION_OVERVIEW_NAMESPACE = "mission-overview" as const;

/**
 * How many bets are still worth watching, out of everything the director ever placed. The total is
 * what the sentence counts, because it is the noun the number agrees with in either language.
 */
export const MISSION_OVERVIEW_EN = {
    betsLive_one: "{{live}} of {{count}} bet still live",
    betsLive_other: "{{live}} of {{count}} bets still live",
    updated: "Updated {{at}}"
};

export const MISSION_OVERVIEW_RU = {
    betsLive_one: "{{live}} из {{count}} ставки ещё в игре",
    betsLive_few: "{{live}} из {{count}} ставок ещё в игре",
    betsLive_many: "{{live}} из {{count}} ставок ещё в игре",
    betsLive_other: "{{live}} из {{count}} ставок ещё в игре",
    updated: "Обновлено {{at}}"
} satisfies Translated<typeof MISSION_OVERVIEW_EN>;
