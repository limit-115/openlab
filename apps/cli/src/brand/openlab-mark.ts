/**
 * The product mark, drawn on the coarsest grid it will ever sit on: the lab's boundary as four crop
 * marks, with a flask standing inside it. It is the same drawing as `brand/svg/openlab-mark.svg`,
 * held to the same proportions — corner arms a sixth of the side, a flask two thirds of the frame's
 * width standing on its floor — at the resolution a terminal's cells allow.
 *
 * One stroke throughout and no colour of its own, so it takes the terminal's foreground the way the
 * SVG takes `currentColor`. That is the brand rule that makes the mark survive down here at all.
 *
 * The three-space indent is the lockup, not decoration: it puts the mark's left edge on the column
 * @clack/prompts sets its titles in, so the mark and the name that opens the block below it stack
 * into one piece of ink.
 */
export const OPENLAB_MARK = [
    "   ┌──           ──┐",
    "   │               │",
    "         ─────",
    "          │ │",
    "         ╱   ╲",
    "        ╱     ╲",
    "       ╱───────╲",
    "   │  ╱_________╲  │",
    "   └──           ──┘"
].join("\n");
