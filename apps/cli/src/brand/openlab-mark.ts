/**
 * The product mark, drawn on the coarsest grid it will ever sit on: the lab's boundary as four crop
 * marks, with a flask standing inside it. It is the same drawing as `brand/svg/openlab-mark.svg`,
 * and it is held to that drawing's proportions rather than to what happens to fit — corner arms a
 * sixth of the side, a rim wider than the neck it caps, a liquid line meeting both walls, and a
 * flask two thirds of the frame's width standing on its floor.
 *
 * Two things about a terminal decide every glyph here. A cell is twice as tall as it is wide, so a
 * mark that is square on the page needs about twice as many columns as rows, and a wall that steps
 * one column per row is already the flask's true slope. And a cell is either ink or it is not, so
 * the joins carry the drawing: the rim meets the neck at `┬`, the base turns at `╰╯`, and the walls
 * leave the neck's own column so the shoulder never steps inward.
 *
 * One stroke throughout and no colour of its own, so it takes the terminal's foreground the way the
 * SVG takes `currentColor`. That is the brand rule that makes the mark survive down here at all, and
 * it is why the mark is line-drawn rather than built from block elements: the block glyphs are a
 * heavier ink than the rail @clack/prompts draws under it, and the lockup would read as two weights.
 *
 * The three-space indent is the lockup, not decoration: it puts the mark's left edge on the column
 * @clack/prompts sets its titles in, so the mark and the name that opens the block below it stack
 * into one piece of ink.
 */
export const OPENLAB_MARK = [
    "   ┌────           ────┐",
    "   │                   │",
    "   │       ─┬─┬─       │",
    "            │ │",
    "            ╱ ╲",
    "           ╱   ╲",
    "          ╱─────╲",
    "         ╱       ╲",
    "   │     ╰───────╯     │",
    "   │                   │",
    "   └────           ────┘"
].join("\n");
