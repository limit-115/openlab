import { Button } from "#src/design-system/button";
import { SECTION_LINKS, SECTION_NAV } from "#src/lab-header/section-nav.const";

export function SectionNav() {
    return (
        <nav className={SECTION_NAV} aria-label="Dashboard sections">
            {SECTION_LINKS.map((link) => (
                <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                >
                    <a href={link.href}>{link.label}</a>
                </Button>
            ))}
        </nav>
    );
}
