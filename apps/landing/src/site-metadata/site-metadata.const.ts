/**
 * The two lines quoted by everything that is not this page: a search result, a shared link, an
 * answer engine. They name Codex and Claude Code outright, because the page's own phrasing for
 * them — the agent CLI you are already signed in to — is true and completely unsearchable, and
 * someone looking for this lab is looking for the harness they already run.
 */
export const TITLE = "OpenLab — a research lab that runs on your machine";

export const DESCRIPTION =
    "A research lab that runs on your machine. Autonomous investigations driven by the Codex and Claude Code CLIs you are already signed in to.";

/**
 * Where the source is. The git remote still carries the owner the repository was created under and
 * GitHub redirects it here, so the canonical owner is the one written down: a redirect lasts only
 * until somebody creates a repository under the retired name. Stated once because the header, the
 * footer and the structured data all point at it, and a page that names its repository three times
 * will eventually name three different ones.
 */
export const REPOSITORY_URL = "https://github.com/limit-115/openlab";

/** The licence the lab is released under, linked wherever the page claims it. */
export const LICENSE_URL = "https://www.apache.org/licenses/LICENSE-2.0";

/**
 * Stating the size lets a card reserve the space before the image arrives, so the preview does not
 * reflow under the reader. The alt text describes the picture rather than repeating the title,
 * which is what someone hearing the card read aloud is missing.
 */
export const SOCIAL_PREVIEW = {
    path: "/social-preview-1280x640.png",
    width: "1280",
    height: "640",
    alt: "The OpenLab lockup: a flask inside focus brackets, beside the word OpenLab"
} as const;
