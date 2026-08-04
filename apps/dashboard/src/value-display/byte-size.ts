const SIZE_UNITS = ["bytes", "KB", "MB", "GB", "TB"] as const;
const UNIT_STEP = 1024;

const wholeFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const preciseFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

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
    const formatter = unit === 0 ? wholeFormatter : preciseFormatter;
    return `${formatter.format(size)} ${SIZE_UNITS[unit]}`;
}
