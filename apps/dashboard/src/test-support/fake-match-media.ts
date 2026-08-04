/**
 * jsdom has no layout engine and so no matchMedia, which the sidebar calls as it renders. Every
 * query comes back unmatched.
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
