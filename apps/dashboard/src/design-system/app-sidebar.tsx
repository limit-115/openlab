"use client";

import { FlaskConicalIcon, MicroscopeIcon, Settings2Icon } from "lucide-react";
import type * as React from "react";
import { Link, NavLink } from "react-router";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { NavSecondary } from "#src/design-system/nav-secondary";
import { NavUser } from "#src/design-system/nav-user";
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
import { NewInvestigationDialog } from "#src/investigation-roster/new-investigation-dialog";
import { RecentInvestigations } from "#src/investigation-roster/recent-investigations";
import { LAB_NAME, LAB_SUBTITLE } from "#src/lab-shell/lab-shell.const";

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg"
    },
    navMain: [
        {
            title: "Investigations",
            url: LabRoute.ROSTER,
            icon: <MicroscopeIcon />
        }
    ],
    navSecondary: [
        {
            title: "Settings",
            url: LabRoute.SETTINGS,
            icon: <Settings2Icon />
        }
    ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar variant="inset" {...props}>
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
                                    <span className="text-sm">{LAB_SUBTITLE}</span>
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
                        {data.navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild tooltip={item.title}>
                                    <NavLink to={item.url} end>
                                        {item.icon}
                                        <span>{item.title}</span>
                                    </NavLink>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
                <RecentInvestigations />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
