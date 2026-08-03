import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "#src/design-system/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "#src/design-system/dropdown-menu";
import { MODE_TOGGLE_MOON, MODE_TOGGLE_SUN } from "#src/theme/mode-toggle.const";
import { THEME_LABEL, Theme } from "#src/theme/theme.const";
import { useTheme } from "#src/theme/theme-provider";

/** The one control that repaints the dashboard. Its icon reads as the palette currently on. */
export function ModeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <SunIcon className={MODE_TOGGLE_SUN} />
                    <MoonIcon className={MODE_TOGGLE_MOON} />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {Object.values(Theme).map((choice) => (
                    <DropdownMenuItem key={choice} onClick={() => setTheme(choice)}>
                        {THEME_LABEL[choice]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
