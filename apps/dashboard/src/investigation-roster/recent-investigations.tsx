import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
import { investigationAddress } from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "#src/design-system/sidebar";
import { RECENT_GOAL, RECENTS_SHOWN } from "#src/investigation-roster/investigation-roster.const";
import { INVESTIGATION_ROSTER_NAMESPACE } from "#src/investigation-roster/investigation-roster.i18n";
import {
    fetchInvestigationRoster,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";
import { INVESTIGATION_STATE_NAMESPACE } from "#src/investigation-state/investigation-state.i18n";
import {
    STATE_DOT,
    STATE_DOT_TONE
} from "#src/investigation-state/investigation-state-display.const";

/**
 * The investigations the lab touched last, newest first. It reads the same roster the page does, so
 * the stream the roster subscribes to moves this list too.
 */
export function RecentInvestigations() {
    const { t } = useTranslation(INVESTIGATION_ROSTER_NAMESPACE);
    const { t: state } = useTranslation(INVESTIGATION_STATE_NAMESPACE);
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
            <SidebarGroupLabel>{t("recents")}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu aria-label={t("recents")}>
                    {recent.map((investigation) => (
                        <SidebarMenuItem key={investigation.id}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === investigationAddress(investigation.id)}
                                tooltip={`${investigation.goal} · ${state(investigation.state)}`}
                            >
                                <NavLink to={investigationAddress(investigation.id)}>
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
