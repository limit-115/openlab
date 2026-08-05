/**
 * The lab is called this in every language, the way a piece of software is called what it is. It is
 * written this way wherever a person reads it; the machine-readable spelling is `openlab`, and it
 * belongs to the package name and the command, not to anything drawn on a screen.
 */
export const LAB_NAME = "OpenLab" as const;

/**
 * The mark beside the name, at the one size the dashboard shows it. The brand pack states the
 * lockup as shares of the mark's height: the word is set at 0.69 of it, and the gap that puts the
 * documented distance between the two inks is 0.116 of it once both bearings are counted.
 *
 * At a 36px mark those come to a 24.8px word and a 4.2px gap, which the named scale reaches within
 * a percent: `text-2xl` and `gap-1`. To draw the lockup larger, move all three together rather than
 * any one of them, and keep landing on the scale.
 */
export const BRAND_LOCKUP = "flex items-center gap-1" as const;
export const BRAND_LOCKUP_MARK = "size-9 shrink-0" as const;
/** Weight 640 is the brand's own, between `font-semibold` and `font-bold`; Inter Variable holds it. */
export const BRAND_LOCKUP_WORD = "font-[640] text-2xl leading-none" as const;
