import { localeFormatter } from "#src/value-display/locale-formatter";

const countFormatter = localeFormatter(
    (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
);

/** A whole count, grouped, so four figures are read rather than counted digit by digit. */
export function formatCount(count: number): string {
    return countFormatter().format(Math.max(0, Math.round(count)));
}
