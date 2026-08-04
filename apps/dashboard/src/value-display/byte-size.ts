import i18next from "i18next";
import { localeFormatter } from "#src/value-display/locale-formatter";
import { VALUE_DISPLAY_NAMESPACE } from "#src/value-display/value-display.i18n";

const SIZE_UNITS = ["bytes", "kilobytes", "megabytes", "gigabytes", "terabytes"] as const;
const UNIT_STEP = 1024;

const wholeFormatter = localeFormatter(
    (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
);
const preciseFormatter = localeFormatter(
    (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
);

/**
 * A size an operator reads to decide whether to act on it. Bytes are shown whole because a fraction
 * of one means nothing; every larger unit keeps one decimal, so 1.4 GB does not read as 1 GB.
 */
export function formatByteSize(bytes: number): string {
    let size = Math.max(0, bytes);
    let unit = 0;
    while (size >= UNIT_STEP && unit < SIZE_UNITS.length - 1) {
        size /= UNIT_STEP;
        unit += 1;
    }
    const formatter = unit === 0 ? wholeFormatter() : preciseFormatter();
    const named = SIZE_UNITS[unit] ?? SIZE_UNITS[0];

    return `${formatter.format(size)} ${i18next.t(named, { ns: VALUE_DISPLAY_NAMESPACE })}`;
}
