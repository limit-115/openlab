/**
 * The product mark, drawn on the coarsest grid it will ever sit on: the lab's boundary as four crop
 * marks, with a flask standing inside it. It is the same drawing as `brand/svg/openlab-mark.svg`,
 * and it is held to that drawing's proportions rather than to what happens to fit — corner arms a
 * sixth of the side, a rim wider than the neck it caps, a liquid line meeting both walls, and a
 * flask two thirds of the frame's width standing on its floor.
 *
 * It is built from quarter blocks, which is what makes those proportions reachable at all. A cell is
 * twice as tall as it is wide, so a mark that is square on the page would have to be drawn with
 * twice as many columns as rows, and a line-drawn stroke can only ever land on a whole cell. Cutting
 * each cell into four gives a sub-grid of 36 by 18 that is very nearly square, and the flask's true
 * wall slope of roughly one across for two down becomes one sub-column per sub-row.
 *
 * That resolution has a price and the price is paid deliberately: block glyphs are heavier ink than
 * the rail @clack/prompts draws underneath. The mark is meant to read as a mark rather than as more
 * of the frame, so the weight is the point. It still carries no colour of its own and takes the
 * terminal's foreground the way the SVG takes `currentColor`, which is the brand rule that lets the
 * mark survive down here.
 *
 * Every glyph is on a parity that renders a whole stroke. Shifting a run by one sub-row or widening
 * it by one sub-column flips which quadrants are lit, and the wall that was a clean `▞` becomes two
 * corner specks. Redraw it on the sub-grid rather than by editing these lines.
 *
 * The three-space indent is the lockup, not decoration: it puts the mark's left edge on the column
 * @clack/prompts sets its titles in, so the mark and the name that opens the block below it stack
 * into one piece of ink.
 */
export const OPENLAB_MARK = [
    "   ▛▀▀▀          ▀▀▀▜",
    "   ▌      ▄▄▄▄      ▐",
    "          ▐  ▌",
    "          ▐  ▌",
    "          ▞  ▚",
    "         ▞▀▀▀▀▚",
    "        ▟▄▄▄▄▄▄▙",
    "   ▌                ▐",
    "   ▙▄▄▄          ▄▄▄▟"
].join("\n");
