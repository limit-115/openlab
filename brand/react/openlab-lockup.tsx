import { OpenLabMark } from "#src/brand/openlab-mark";

type OpenLabLockupProps = {
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
export function OpenLabLockup({ className }: OpenLabLockupProps) {
    return (
        <span className={className}>
            <span className="flex items-center gap-[6px]">
                <OpenLabMark className="size-12 shrink-0" />
                <span className="font-[640] text-[33px] leading-none">OpenLab</span>
            </span>
        </span>
    );
}
