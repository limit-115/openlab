import { AgentActivityPhase } from "@lab/protocol/agent-activity/agent-activity.const";
import { AgentEffortLevel } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const TEAM_NAMESPACE = "team" as const;

export const TEAM_EN = {
    agents: "Agents",

    /** One agent, so the role is singular here; the cycle rail counts them and says it in the plural. */
    [AgentRole.DIRECTOR]: "Director",
    [AgentRole.RESEARCHER]: "Researcher",
    [AgentRole.VERIFIER]: "Verifier",

    [AgentActivityPhase.STARTING]: "Starting",
    [AgentActivityPhase.THINKING]: "Thinking",
    [AgentActivityPhase.RESPONDING]: "Writing",
    [AgentActivityPhase.USING_TOOL]: "Using a tool",
    [AgentActivityPhase.FINISHED]: "Finished",

    /**
     * The harness names itself, so only the effort is written out. The execution line reads as three
     * items rather than a sentence, which is why the effort opens like one.
     */
    execution: "{{harness}} · {{model}} · {{effort}} effort",
    [AgentEffortLevel.LOW]: "Low",
    [AgentEffortLevel.MEDIUM]: "Medium",
    [AgentEffortLevel.HIGH]: "High",
    [AgentEffortLevel.XHIGH]: "Extra high",
    [AgentEffortLevel.MAX]: "Maximum",

    thinking_one: "Thinking · {{count}} character",
    thinking_other: "Thinking · {{count}} characters",

    usage: "{{parts}} tokens",
    tokensIn: "{{count}} in",
    tokensOut: "{{count}} out",
    tokensCached: "{{count}} cached",

    noAgentsTitle: "No agent is running",
    noAgentsDescription:
        "Directors, researchers, critics and verifiers appear here while the investigation is working.",
    noActivity: "Waiting for the harness to report"
};

export const TEAM_RU = {
    agents: "Агенты",

    [AgentRole.DIRECTOR]: "Директор",
    [AgentRole.RESEARCHER]: "Исследователь",
    [AgentRole.VERIFIER]: "Проверяющий",

    [AgentActivityPhase.STARTING]: "Запускается",
    [AgentActivityPhase.THINKING]: "Думает",
    [AgentActivityPhase.RESPONDING]: "Пишет",
    [AgentActivityPhase.USING_TOOL]: "Работает инструментом",
    [AgentActivityPhase.FINISHED]: "Закончил",

    execution: "{{harness}} · {{model}} · усилия: {{effort}}",
    [AgentEffortLevel.LOW]: "низкие",
    [AgentEffortLevel.MEDIUM]: "средние",
    [AgentEffortLevel.HIGH]: "высокие",
    [AgentEffortLevel.XHIGH]: "очень высокие",
    [AgentEffortLevel.MAX]: "максимальные",

    thinking_one: "Размышления · {{count}} символ",
    thinking_few: "Размышления · {{count}} символа",
    thinking_many: "Размышления · {{count}} символов",
    thinking_other: "Размышления · {{count}} символов",

    usage: "Токены: {{parts}}",
    tokensIn: "{{count}} на вход",
    tokensOut: "{{count}} на выход",
    tokensCached: "{{count}} из кэша",

    noAgentsTitle: "Ни один агент не работает",
    noAgentsDescription:
        "Директоры, исследователи, критики и проверяющие появляются здесь, пока исследование работает.",
    noActivity: "Ожидание отчёта от оболочки"
} satisfies Translated<typeof TEAM_EN>;
