import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";

export const INVESTIGATION_STATE_NAMESPACE = "investigation-state" as const;

/**
 * The lifecycle names its states in capitals, which on the page reads as shouting. They are written
 * out here instead: a text transform cannot lower the rest of a word, only raise its first letter.
 */
export const INVESTIGATION_STATE_EN = {
    [InvestigationState.RUNNING]: "Running",
    [InvestigationState.HIBERNATING]: "Hibernating",
    [InvestigationState.BREAKTHROUGH]: "Breakthrough",
    [InvestigationState.FAILED]: "Failed",
    [InvestigationState.STOPPED]: "Stopped"
} satisfies Record<InvestigationState, string>;

export const INVESTIGATION_STATE_RU = {
    [InvestigationState.RUNNING]: "Выполняется",
    [InvestigationState.HIBERNATING]: "В спячке",
    [InvestigationState.BREAKTHROUGH]: "Прорыв",
    [InvestigationState.FAILED]: "Сбой",
    [InvestigationState.STOPPED]: "Остановлено"
} satisfies typeof INVESTIGATION_STATE_EN;
