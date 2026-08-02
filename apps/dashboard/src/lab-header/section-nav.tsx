import { SECTION_LINKS, SECTION_NAV, SECTION_NAV_LINK } from "#src/lab-header/section-nav.const";

export function SectionNav() {
    return (
        <nav className={SECTION_NAV} aria-label="Dashboard sections">
            {SECTION_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={SECTION_NAV_LINK}>
                    {link.label}
                </a>
            ))}
        </nav>
    );
}
