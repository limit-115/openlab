import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import { Theme } from "#src/theme/theme.const";
import { THEME_NAMESPACE } from "#src/theme/theme.i18n";
import { useTheme } from "#src/theme/theme-provider";
import { WELCOME_CHOICES } from "#src/welcome/welcome.const";

/**
 * The palette, offered beside the language for the same reason: both decide how the rest of the
 * introduction reads, and an operator who wants the lab light should not have to finish the setup
 * squinting at it first. It is the same choice the sidebar keeps offering afterwards.
 */
export function WelcomeThemeChoice() {
    const { t } = useTranslation(THEME_NAMESPACE);
    const { theme, setTheme } = useTheme();

    return (
        <fieldset className={WELCOME_CHOICES} aria-label={t("label")}>
            {Object.values(Theme).map((choice) => (
                <Button
                    key={choice}
                    type="button"
                    size="sm"
                    variant={theme === choice ? "secondary" : "ghost"}
                    aria-pressed={theme === choice}
                    onClick={() => setTheme(choice)}
                >
                    {t(choice)}
                </Button>
            ))}
        </fieldset>
    );
}
