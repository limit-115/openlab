import { LanguagesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "#src/design-system/dropdown-menu";
import { SidebarMenuButton } from "#src/design-system/sidebar";
import { chooseInterfaceLanguage } from "#src/interface-language/interface-language";
import { LOCALE_LABEL, Locale } from "#src/interface-language/interface-language.const";
import { INTERFACE_LANGUAGE_NAMESPACE } from "#src/interface-language/interface-language.i18n";

/**
 * The one control that rewrites the dashboard. It stands beside the palette in the sidebar and
 * reads as one of the addresses there. The menu is a set of radios rather than plain items because
 * the interface is always in one of these languages, and the operator is replacing it, not adding.
 */
export function LanguageEntry() {
    const { t, i18n } = useTranslation(INTERFACE_LANGUAGE_NAMESPACE);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="sm">
                    <LanguagesIcon />
                    <span>{t("label")}</span>
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
                <DropdownMenuRadioGroup value={i18n.language}>
                    {Object.values(Locale).map((locale) => (
                        <DropdownMenuRadioItem
                            key={locale}
                            value={locale}
                            onSelect={() => chooseInterfaceLanguage(locale)}
                        >
                            {LOCALE_LABEL[locale]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
