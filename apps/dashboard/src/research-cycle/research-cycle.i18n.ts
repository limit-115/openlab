import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const RESEARCH_CYCLE_NAMESPACE = "research-cycle" as const;

/**
 * A stage is named for the role that takes it, and says how its agents are doing by counting them.
 * Every count is a sentence about people, so both languages inflect it.
 */
export const RESEARCH_CYCLE_EN = {
    title: "Research cycle",
    [AgentRole.DIRECTOR]: "Director",
    [AgentRole.RESEARCHER]: "Researchers",
    [AgentRole.VERIFIER]: "Verifiers",
    notReached: "Not reached yet",
    working_one: "{{count}} working",
    working_other: "{{count}} working",
    blocked_one: "{{count}} blocked",
    blocked_other: "{{count}} blocked",
    finished_one: "{{count}} finished",
    finished_other: "{{count}} finished",
    stopped_one: "{{count}} stopped",
    stopped_other: "{{count}} stopped"
};

export const RESEARCH_CYCLE_RU = {
    title: "Цикл исследования",
    [AgentRole.DIRECTOR]: "Директор",
    [AgentRole.RESEARCHER]: "Исследователи",
    [AgentRole.VERIFIER]: "Проверяющие",
    notReached: "Ещё не дошли",
    working_one: "{{count}} работает",
    working_few: "{{count}} работают",
    working_many: "{{count}} работают",
    working_other: "{{count}} работают",
    blocked_one: "{{count}} заблокирован",
    blocked_few: "{{count}} заблокированы",
    blocked_many: "{{count}} заблокированы",
    blocked_other: "{{count}} заблокированы",
    finished_one: "{{count}} завершил",
    finished_few: "{{count}} завершили",
    finished_many: "{{count}} завершили",
    finished_other: "{{count}} завершили",
    stopped_one: "{{count}} остановлен",
    stopped_few: "{{count}} остановлены",
    stopped_many: "{{count}} остановлены",
    stopped_other: "{{count}} остановлены"
} satisfies Translated<typeof RESEARCH_CYCLE_EN>;
