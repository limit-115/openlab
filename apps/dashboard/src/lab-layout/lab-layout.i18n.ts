import { LabPlace } from "#src/lab-layout/lab-layout.const";

export const LAB_LAYOUT_NAMESPACE = "lab-layout" as const;

/**
 * The lab names itself the same way in both languages, so its name is not here. What is here is
 * everything said about it: what kind of thing it is, and what each of its places is called.
 */
export const LAB_LAYOUT_EN = {
    subtitle: "Local runtime",
    [LabPlace.ROSTER]: "Investigations",
    [LabPlace.SETTINGS]: "Settings"
} satisfies Record<LabPlace | "subtitle", string>;

export const LAB_LAYOUT_RU = {
    subtitle: "Локальная среда",
    [LabPlace.ROSTER]: "Исследования",
    [LabPlace.SETTINGS]: "Настройки"
} satisfies typeof LAB_LAYOUT_EN;
