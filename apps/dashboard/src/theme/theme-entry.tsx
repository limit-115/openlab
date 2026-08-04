import { MoonIcon, SunIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "#src/design-system/dropdown-menu";
import { SidebarMenuButton } from "#src/design-system/sidebar";
import { THEME_LABEL, Theme } from "#src/theme/theme.const";
import {
    THEME_ENTRY_ICONS,
    THEME_ENTRY_LABEL,
    THEME_ENTRY_MOON,
    THEME_ENTRY_SUN
} from "#src/theme/theme-entry.const";
import { useTheme } from "#src/theme/theme-provider";

/**
 * The one control that repaints the dashboard. It stands among the addresses the sidebar always
 * offers and reads as one of them, and its icon reads as the palette currently on.
 */
export function ThemeEntry() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="sm">
                    <span className={THEME_ENTRY_ICONS}>
                        <SunIcon className={THEME_ENTRY_SUN} />
                        <MoonIcon className={THEME_ENTRY_MOON} />
                    </span>
                    <span>{THEME_ENTRY_LABEL}</span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
                {Object.values(Theme).map((choice) => (
                    <DropdownMenuItem key={choice} onClick={() => setTheme(choice)}>
                        {THEME_LABEL[choice]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
