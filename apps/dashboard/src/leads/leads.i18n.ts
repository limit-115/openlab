import type { Translated } from "#src/interface-language/translation-catalog.types";

export const LEADS_NAMESPACE = "leads" as const;

export const LEADS_EN = {
    title: "Leads",
    description: "Where the director thinks the goal might be reachable",
    emptyTitle: "No leads opened yet",
    emptyDescription: "The director is still working out where this goal might be reachable.",

    /** What the disclosure says about a claim before it is opened. */
    verdictConfirmed: "Verifier confirmed it",
    verdictRefuted: "Verifier refuted it",
    verdictPending: "No verdict yet",

    researcher: "How the researcher got there",
    verifier: "What the verifier did",
    artifacts: "Files it left behind"
};

export const LEADS_RU = {
    title: "Зацепки",
    description: "Где, по мнению директора, цель может оказаться достижимой",
    emptyTitle: "Ставок пока нет",
    emptyDescription: "Директор ещё определяет, где эта цель может оказаться достижимой.",

    verdictConfirmed: "Проверяющий подтвердил",
    verdictRefuted: "Проверяющий опроверг",
    verdictPending: "Вердикта пока нет",

    researcher: "Как исследователь к этому пришёл",
    verifier: "Что сделал проверяющий",
    artifacts: "Оставленные файлы"
} satisfies Translated<typeof LEADS_EN>;
