import {
    BRAND_LOCKUP,
    BRAND_LOCKUP_MARK,
    BRAND_LOCKUP_WORD,
    LAB_NAME
} from "#src/brand/brand.const";
import { OpenLabMark } from "#src/brand/openlab-mark";

/**
 * The mark beside the name, built from the mark and live text rather than from the pack's lockup
 * file. The dashboard already loads the typeface the lockup is set in, so composing it here costs
 * nothing, stays crisp at any size, and never falls out of step when the typeface updates — the
 * standalone files carry a copy of Inter Variable inside them and are 64KB each for it.
 *
 * Both halves are one colour, which is how the pack draws it: the lockup takes `currentColor` from
 * whatever it stands in.
 */
export function OpenLabLockup() {
    return (
        <span className={BRAND_LOCKUP}>
            <OpenLabMark className={BRAND_LOCKUP_MARK} decorative />
            <span className={BRAND_LOCKUP_WORD}>{LAB_NAME}</span>
        </span>
    );
}
