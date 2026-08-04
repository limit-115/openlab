import { FlaskConicalIcon, MicroscopeIcon, Settings2Icon } from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useMatch } from "react-router";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "#src/design-system/sidebar";
import { LanguageEntry } from "#src/interface-language/language-entry";
import { NewInvestigationDialog } from "#src/investigation-roster/new-investigation-dialog";
import { RecentInvestigations } from "#src/investigation-roster/recent-investigations";
import { LAB_NAME, LAB_SETTINGS, LAB_VIEWS } from "#src/lab-layout/lab-layout.const";
import { LAB_LAYOUT_NAMESPACE } from "#src/lab-layout/lab-layout.i18n";
import { ThemeEntry } from "#src/theme/theme-entry";

/**
 * Everything the lab is reachable through: what it is, what to open, and what it holds. The
 * addresses that stand apart from the lab's work sit on a shelf of their own, outside what scrolls,
 * so a long roster cannot carry them off the screen.
 */
export function LabSidebar() {
    const { t } = useTranslation(LAB_LAYOUT_NAMESPACE);

    return (
        <Sidebar variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to={LabRoute.ROSTER}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <FlaskConicalIcon className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="font-medium">{LAB_NAME}</span>
                                    <span className="text-sm">{t("subtitle")}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <NewInvestigationDialog />
                        </SidebarMenuItem>
                        {LAB_VIEWS.map((view) => (
                            <LabEntry key={view.route} route={view.route} label={t(view.place)}>
                                <MicroscopeIcon />
                            </LabEntry>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <RecentInvestigations />
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <LanguageEntry />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <ThemeEntry />
                    </SidebarMenuItem>
                    <LabEntry route={LAB_SETTINGS.route} label={t(LAB_SETTINGS.place)} size="sm">
                        <Settings2Icon />
                    </LabEntry>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

interface LabEntryProps {
    route: string;
    label: string;
    size?: "default" | "sm";
    children: React.ReactNode;
}

/** An address the lab always offers. It is marked while the page it opens is the page being read. */
function LabEntry({ route, label, size = "default", children }: LabEntryProps) {
    const open = useMatch(route) !== null;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild size={size} tooltip={label} isActive={open}>
                <NavLink to={route} end>
                    {children}
                    <span>{label}</span>
                </NavLink>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
