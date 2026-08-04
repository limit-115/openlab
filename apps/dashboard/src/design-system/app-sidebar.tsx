"use client";

import {
    BookOpenIcon,
    BotIcon,
    FlaskConicalIcon,
    FrameIcon,
    MapIcon,
    PieChartIcon,
    Settings2Icon,
    TerminalSquareIcon
} from "lucide-react";
import type * as React from "react";
import { Link } from "react-router";
import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { NavMain } from "#src/design-system/nav-main";
import { NavProjects } from "#src/design-system/nav-projects";
import { NavSecondary } from "#src/design-system/nav-secondary";
import { NavUser } from "#src/design-system/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "#src/design-system/sidebar";
import { LAB_NAME, LAB_SUBTITLE } from "#src/lab-shell/lab-shell.const";

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg"
    },
    navMain: [
        {
            title: "Playground",
            url: "#",
            icon: <TerminalSquareIcon />,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#"
                },
                {
                    title: "Starred",
                    url: "#"
                },
                {
                    title: "Settings",
                    url: "#"
                }
            ]
        },
        {
            title: "Models",
            url: "#",
            icon: <BotIcon />,
            items: [
                {
                    title: "Genesis",
                    url: "#"
                },
                {
                    title: "Explorer",
                    url: "#"
                },
                {
                    title: "Quantum",
                    url: "#"
                }
            ]
        },
        {
            title: "Documentation",
            url: "#",
            icon: <BookOpenIcon />,
            items: [
                {
                    title: "Introduction",
                    url: "#"
                },
                {
                    title: "Get Started",
                    url: "#"
                },
                {
                    title: "Tutorials",
                    url: "#"
                },
                {
                    title: "Changelog",
                    url: "#"
                }
            ]
        },
        {
            title: "Settings",
            url: "#",
            icon: <Settings2Icon />,
            items: [
                {
                    title: "General",
                    url: "#"
                },
                {
                    title: "Team",
                    url: "#"
                },
                {
                    title: "Billing",
                    url: "#"
                },
                {
                    title: "Limits",
                    url: "#"
                }
            ]
        }
    ],
    navSecondary: [
        {
            title: "Settings",
            url: LabRoute.SETTINGS,
            icon: <Settings2Icon />
        }
    ],
    projects: [
        {
            name: "Design Engineering",
            url: "#",
            icon: <FrameIcon />
        },
        {
            name: "Sales & Marketing",
            url: "#",
            icon: <PieChartIcon />
        },
        {
            name: "Travel",
            url: "#",
            icon: <MapIcon />
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
                <NavMain items={data.navMain} />
                <NavProjects projects={data.projects} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
