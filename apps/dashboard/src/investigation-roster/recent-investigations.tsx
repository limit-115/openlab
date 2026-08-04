import { useQuery } from "@tanstack/react-query";
import { NavLink, useLocation } from "react-router";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
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
import {
    INVESTIGATION_STATE_LABEL,
    STATE_DOT,
    STATE_DOT_TONE
} from "#src/investigation-state/investigation-state-display.const";

/**
 * An investigation stays the open one across every view of it, so the entry is still marked when
 * the operator has stepped from its overview into one of its views.
 */
function isOpen(pathname: string, address: string): boolean {
    return pathname === address || pathname.startsWith(`${address}/`);
}

/**
 * The investigations the lab touched last, newest first. It reads the same roster the page does, so
 * the stream the roster subscribes to moves this list too.
 */
export function RecentInvestigations() {
    const { pathname } = useLocation();
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
                            <SidebarMenuButton
                                asChild
                                isActive={isOpen(pathname, investigationView(investigation.id))}
                                tooltip={`${investigation.goal} · ${INVESTIGATION_STATE_LABEL[investigation.state]}`}
                            >
                                <NavLink to={investigationView(investigation.id)}>
                                    <span
                                        className={cn(
                                            STATE_DOT,
                                            STATE_DOT_TONE[investigation.state]
                                        )}
                                        aria-hidden="true"
                                    />
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
