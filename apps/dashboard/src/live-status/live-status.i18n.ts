import type { Translated } from "#src/interface-language/translation-catalog.types";
import { StreamState } from "#src/live-status/status-stream.const";

export const LIVE_STATUS_NAMESPACE = "live-status" as const;

/** Where the stream stands, and what the daemon said when a snapshot could not be read. */
export const LIVE_STATUS_EN = {
    [StreamState.CONNECTING]: "Connecting",
    [StreamState.LIVE]: "Live",
    [StreamState.RECONNECTING]: "Reconnecting",
    [StreamState.UNAVAILABLE]: "Offline",
    invalidUpdate: "Invalid live update",
    missingInvestigation: "The lab is not holding this investigation any more.",
    answered: "Status endpoint returned {{status}}."
} satisfies Record<StreamState | "invalidUpdate" | "missingInvestigation" | "answered", string>;

export const LIVE_STATUS_RU = {
    [StreamState.CONNECTING]: "Подключение",
    [StreamState.LIVE]: "В эфире",
    [StreamState.RECONNECTING]: "Переподключение",
    [StreamState.UNAVAILABLE]: "Нет связи",
    invalidUpdate: "Некорректное обновление потока",
    missingInvestigation: "Лаборатория больше не хранит это исследование.",
    answered: "Эндпоинт статуса вернул {{status}}."
} satisfies Translated<typeof LIVE_STATUS_EN>;
