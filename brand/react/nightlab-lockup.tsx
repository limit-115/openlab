import { NightLabMark } from "#src/brand/nightlab-mark";

type NightLabLockupProps = {
    className?: string;
};

/**
 * The mark beside the name. The proportions are the ones the SVG lockups are built on: the word is
 * set at 0.69 of the mark's height, and the gap is what puts 0.28 of that height between the mark's
 * ink and the word's ink once both bearings are accounted for.
 *
 * This is the 48px size. To draw it larger, scale all three numbers together rather than any one of
 * them: `size-12` -> `size-16`, `text-[33px]` -> `text-[44px]`, `gap-[6px]` -> `gap-[8px]`.
 */
export function NightLabLockup({ className }: NightLabLockupProps) {
    return (
        <span className={className}>
            <span className="flex items-center gap-[6px]">
                <NightLabMark className="size-12 shrink-0" />
                <span className="font-[640] text-[33px] leading-none">NightLab</span>
            </span>
        </span>
    );
}
