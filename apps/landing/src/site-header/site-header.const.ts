/**
 * What the header offers to jump to, in the order the page answers those questions. Every href here
 * is an anchor on this page and nothing else: the site is one document, so a header that offered a
 * second destination would be promising a page that does not exist.
 */
export const HEADER_LINK = [
    { href: "#install", label: "Install" },
    { href: "#harnesses", label: "Harnesses" },
    { href: "#loop", label: "How it works" },
    { href: "#guardrails", label: "Guardrails" }
] as const;
