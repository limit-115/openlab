import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "#src/design-system/sidebar";
import {
    RECENT_GOAL,
    RECENTS_LABEL,
    RECENTS_SHOWN
} from "#src/investigation-roster/investigation-roster.const";
import {
    fetchInvestigationRoster,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";

/**
 * The investigations the lab touched last, newest first. It reads the same roster the page does, so
 * the stream the roster subscribes to moves this list too.
 */
export function RecentInvestigations() {
    const roster = useQuery({
        queryKey: investigationRosterQueryKey,
        queryFn: ({ signal }) => fetchInvestigationRoster(signal),
        retry: 2,
        staleTime: 5_000,
        refetchInterval: 10_000
    });

    const recent = [...(roster.data ?? [])]
        .sort((one, other) => other.updated_at.localeCompare(one.updated_at))
        .slice(0, RECENTS_SHOWN);

    if (recent.length === 0) {
        return null;
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-sm">{RECENTS_LABEL}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu aria-label={RECENTS_LABEL}>
                    {recent.map((investigation) => (
                        <SidebarMenuItem key={investigation.id}>
                            <SidebarMenuButton asChild tooltip={investigation.goal}>
                                <NavLink to={investigationView(investigation.id)}>
                                    <span className={RECENT_GOAL}>{investigation.goal}</span>
                                </NavLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
