import type { Translated } from "#src/interface-language/translation-catalog.types";

export const BREAKTHROUGH_NAMESPACE = "breakthrough" as const;

export const BREAKTHROUGH_EN = {
    title: "Breakthrough",
    note: "An independent verifier confirmed this claim, so the investigation paused here.",
    verifier: "What the verifier did",
    researcher: "How the researcher got there",
    files: "Result files"
};

export const BREAKTHROUGH_RU = {
    title: "Прорыв",
    note: "Независимый проверяющий подтвердил это утверждение, поэтому исследование остановилось здесь.",
    verifier: "Что сделал проверяющий",
    researcher: "Как исследователь к этому пришёл",
    files: "Файлы результата"
} satisfies Translated<typeof BREAKTHROUGH_EN>;
