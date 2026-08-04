import { InvestigationView } from "#src/dashboard-routes/dashboard-routes.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const INVESTIGATION_HEADER_NAMESPACE = "investigation-header" as const;

export const INVESTIGATION_HEADER_EN = {
    [InvestigationView.OVERVIEW]: "Overview",
    [InvestigationView.TEAM]: "Team",
    /** What the strip of readings is, for anything that cannot see it standing in the header. */
    runtime: "Lab runtime status",
    activeAgents_one: "{{count}} active",
    activeAgents_other: "{{count}} active"
};

export const INVESTIGATION_HEADER_RU = {
    [InvestigationView.OVERVIEW]: "Обзор",
    [InvestigationView.TEAM]: "Команда",
    runtime: "Состояние среды",
    activeAgents_one: "{{count}} активный",
    activeAgents_few: "{{count}} активных",
    activeAgents_many: "{{count}} активных",
    activeAgents_other: "{{count}} активных"
} satisfies Translated<typeof INVESTIGATION_HEADER_EN>;
