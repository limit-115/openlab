/**
 * The cards draw their own separators edge to edge, so the panel body gives up its side padding.
 * The ledger is the page's own subject and is filtered rather than bounded: nesting a scroller
 * inside the page scroller is what makes a long claim hard to reach, not the length itself.
 */
export const CLAIMS_BODY = "px-0" as const;
