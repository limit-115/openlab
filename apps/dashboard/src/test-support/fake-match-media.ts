/**
 * jsdom has no layout engine and so no matchMedia. The sidebar asks whether the viewport is narrow
 * enough to collapse it while it renders, so the tests need the function to exist. Every query comes
 * back unmatched, because a document without layout is never narrow.
 */
export function fakeMatchMedia(query: string): MediaQueryList {
    return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false
    };
}
