import i18next from "i18next";
import { localeFormatter } from "#src/value-display/locale-formatter";
import { VALUE_DISPLAY_NAMESPACE } from "#src/value-display/value-display.i18n";

const dayFormatter = localeFormatter(
    (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
);

/** The largest two units the duration reaches, because a third is noise on a strip somebody scans. */
export function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const t = i18next.getFixedT(null, VALUE_DISPLAY_NAMESPACE);

    if (days > 0) {
        return t("days", { days: dayFormatter().format(days), hours });
    }
    if (hours > 0) {
        return t("hours", { hours, minutes });
    }
    if (minutes > 0) {
        return t("minutes", { minutes, seconds });
    }
    return t("seconds", { seconds });
}
