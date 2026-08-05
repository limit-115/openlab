import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const OUTCOME_PANEL_NAMESPACE = "investigation-outcome" as const;

/**
 * The panel calls itself after the lifecycle state that made it worth showing at all, so its title
 * is one of five and the rest is what the investigation left behind.
 */
export const OUTCOME_PANEL_EN = {
    [InvestigationState.RUNNING]: "Running investigation",
    [InvestigationState.HIBERNATING]: "Hibernating investigation",
    [InvestigationState.BREAKTHROUGH]: "Breakthrough",
    [InvestigationState.FAILED]: "Failed investigation",
    [InvestigationState.STOPPED]: "Stopped investigation",
    outcome: "Lifecycle outcome",
    noReason: "The investigation changed lifecycle state without a reason.",
    limitations: "Known limitations",
    artifacts: "Result artifacts"
} satisfies Record<
    InvestigationState | "outcome" | "noReason" | "limitations" | "artifacts",
    string
>;

export const OUTCOME_PANEL_RU = {
    [InvestigationState.RUNNING]: "Исследование выполняется",
    [InvestigationState.HIBERNATING]: "Исследование в спячке",
    [InvestigationState.BREAKTHROUGH]: "Прорыв",
    [InvestigationState.FAILED]: "Исследование завершилось сбоем",
    [InvestigationState.STOPPED]: "Исследование остановлено",
    outcome: "Исход жизненного цикла",
    noReason: "Исследование сменило состояние, не назвав причину.",
    limitations: "Известные ограничения",
    artifacts: "Артефакты результата"
} satisfies Translated<typeof OUTCOME_PANEL_EN>;
