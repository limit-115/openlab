type NightLabMarkProps = {
    className?: string;
};

/**
 * The product mark: the lab's boundary drawn as four crop marks, with a flask standing inside it.
 * It paints in `currentColor`, so it takes the palette of whatever it sits in and follows the
 * dashboard's light and dark themes without a second copy.
 *
 * The flask is Lucide's `flask-conical` glyph, inlined rather than imported so the frame and the
 * flask stay one indivisible mark. Do not swap it for `<FlaskConicalIcon />`.
 */
export function NightLabMark({ className }: NightLabMarkProps) {
    return (
        <svg viewBox="0 0 64 64" fill="none" role="img" aria-label="NightLab" className={className}>
            <g stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 20V9H20" />
                <path d="M44 9H55V20" />
                <path d="M55 44V55H44" />
                <path d="M20 55H9V44" />
            </g>
            <g
                transform="translate(14.6 14.6) scale(1.45)"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
                <path d="M6.453 15h11.094" />
                <path d="M8.5 2h7" />
            </g>
        </svg>
    );
}
