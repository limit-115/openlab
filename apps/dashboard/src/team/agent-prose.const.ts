import { code } from "@streamdown/code";
import remarkBreaks from "remark-breaks";
import { defaultRemarkPlugins } from "streamdown";

/**
 * Markdown written into a log rather than onto a page.
 *
 * A heading arrives from the renderer at `text-2xl`, which is six times louder than the `text-sm`
 * the agent card titles itself with, so a single `##` would outweigh the agent it belongs to.
 * Headings here mark structure inside a turn, and are sized to say only that.
 *
 * The code header names the language at `text-xs`, below the floor this dashboard reads at, so it
 * is lifted back to the size everything else speaks in.
 */
export const AGENT_PROSE =
    "space-y-2 [&_[data-streamdown=code-block]]:my-2 [&_[data-streamdown=code-block-header]]:text-sm [&_[data-streamdown^=heading-]]:mt-2 [&_[data-streamdown^=heading-]]:mb-1 [&_[data-streamdown^=heading-]]:text-sm" as const;

/** Agents write diffs, commands and JSON. They do not write formulas, diagrams, or CJK. */
export const AGENT_PROSE_PLUGINS = { code } as const;

/**
 * A model ends a line where it means to end one, and the transcript showed every one of those
 * breaks before it read markdown. Markdown alone folds them into the paragraph, so the breaks are
 * put back, appended to the renderer's own plugins rather than replacing them: passing this list
 * is what decides the whole set, and dropping the defaults costs GFM its tables.
 */
export const AGENT_PROSE_REMARK = [...Object.values(defaultRemarkPlugins), remarkBreaks];

/**
 * Copying a command or a table out of a transcript is what an operator does with it. Downloading
 * it writes a file to their disk, and fullscreen covers the roster the transcript is read beside.
 */
export const AGENT_PROSE_CONTROLS = {
    code: { copy: true, download: false },
    table: { copy: true, download: false, fullscreen: false }
} as const;
