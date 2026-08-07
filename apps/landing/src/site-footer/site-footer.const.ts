import { LICENSE_URL, REPOSITORY_URL } from "#src/site-metadata/site-metadata.const";

/**
 * Everywhere the footer can send a reader. Two of them leave this site, and both are the thing the
 * page has been claiming all the way down — the source and the licence — so a reader who wants to
 * check a claim rather than take it has somewhere to go from the bottom of the page.
 */
export const FOOTER_LINK = [
    { href: "#install", label: "Install", external: false },
    { href: REPOSITORY_URL, label: "Source", external: true },
    { href: LICENSE_URL, label: "Licence", external: true }
] as const;
