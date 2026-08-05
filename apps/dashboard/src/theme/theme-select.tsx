import { useTranslation } from "react-i18next";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "#src/design-system/select";
import { THEME_TRIGGER, Theme } from "#src/theme/theme.const";
import { THEME_NAMESPACE } from "#src/theme/theme.i18n";
import { useTheme } from "#src/theme/theme-provider";

/**
 * The palette, wherever a page offers it as a setting rather than as an address in the sidebar. The
 * three choices are one standing answer rather than three switches, so they are read from a list:
 * `system` is not a palette beside the other two but an instruction to keep following the machine.
 */
export function ThemeSelect() {
    const { t } = useTranslation(THEME_NAMESPACE);
    const { theme, setTheme } = useTheme();

    return (
        <Select
            value={theme}
            onValueChange={(chosen) => {
                if (isTheme(chosen)) {
                    setTheme(chosen);
                }
            }}
        >
            <SelectTrigger className={THEME_TRIGGER} aria-label={t("label")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {/* The registry pads the group rather than the popover, so items need one. */}
                <SelectGroup>
                    {Object.values(Theme).map((choice) => (
                        <SelectItem key={choice} value={choice}>
                            {t(choice)}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

function isTheme(value: string): value is Theme {
    return Object.values(Theme).includes(value as Theme);
}
