import type { Translated } from "#src/interface-language/translation-catalog.types";

export const LAB_MAINTENANCE_NAMESPACE = "lab-maintenance" as const;

export const LAB_MAINTENANCE_EN = {
    title: "Storage",
    description: "Where the lab keeps every investigation's directory and what they take up.",
    pending: "Measuring the investigation directories",
    unsupportedTitle: "This runtime does not report its disk",
    unsupportedDescription:
        "A daemon started with a workspace root serves the reading here, and the purge with it.",
    emptyTitle: "The lab is holding nothing on disk",
    emptyDescription: "A directory appears here as soon as an investigation writes one.",

    totalSize: "On disk",
    /**
     * Directories, not investigations: one belongs to each investigation, but a directory left
     * behind outlives the investigation that wrote it, so the count is of what is on disk.
     */
    runCount: "Investigation directories",
    totalFileCount: "Files",
    copyWorkspaceRoot: "Copy the workspace root path",

    runTable: "Investigation directories",
    unheldRun: "No investigation holds this directory",
    copyRunDirectory: "Copy the investigation directory path",
    directoryColumn: "Directory",
    shareColumn: "Share of the lab",
    sizeColumn: "Size",
    fileCountColumn: "Files",
    copyColumn: "Copy",

    purge: "Purge the lab",
    purging: "Purging",
    purgeTitle: "Purge every investigation?",
    purgeConsequence:
        "Every investigation stops, and its bets, findings, verdicts and directory are deleted along with every directory left behind. This cannot be undone.",
    purgeConfirm: "Purge it all",
    purgeCancel: "Keep the lab",
    purgeFailure: "The lab could not be purged."
};

export const LAB_MAINTENANCE_RU = {
    title: "Хранилище",
    description: "Где лаборатория держит каталоги исследований и сколько они занимают.",
    pending: "Измеряем каталоги исследований",
    unsupportedTitle: "Эта среда не сообщает о своём диске",
    unsupportedDescription:
        "Демон, запущенный с корнем рабочей области, отдаёт эти данные здесь, а вместе с ними и очистку.",
    emptyTitle: "На диске лаборатории ничего нет",
    emptyDescription: "Каталог появится здесь, как только исследование его создаст.",

    totalSize: "На диске",
    runCount: "Каталоги исследований",
    totalFileCount: "Файлы",
    copyWorkspaceRoot: "Скопировать путь к корню рабочей области",

    runTable: "Каталоги исследований",
    unheldRun: "Ни одно исследование не держит этот каталог",
    copyRunDirectory: "Скопировать путь к каталогу исследования",
    directoryColumn: "Каталог",
    shareColumn: "Доля лаборатории",
    sizeColumn: "Размер",
    fileCountColumn: "Файлы",
    copyColumn: "Копировать",

    purge: "Очистить лабораторию",
    purging: "Очистка",
    purgeTitle: "Очистить все исследования?",
    purgeConsequence:
        "Все исследования останавливаются, их ставки, находки, вердикты и каталоги удаляются вместе со всеми оставшимися каталогами. Это необратимо.",
    purgeConfirm: "Очистить всё",
    purgeCancel: "Оставить как есть",
    purgeFailure: "Лабораторию не удалось очистить."
} satisfies Translated<typeof LAB_MAINTENANCE_EN>;
