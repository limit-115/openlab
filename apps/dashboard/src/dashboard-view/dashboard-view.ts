import { useCallback, useEffect, useState } from "react";
import { DashboardView, TEAM_FRAGMENT } from "#src/dashboard-view/dashboard-view.const";

function currentView(): DashboardView {
    return typeof window !== "undefined" && window.location.hash === TEAM_FRAGMENT
        ? DashboardView.TEAM
        : DashboardView.OVERVIEW;
}

/** Keeps the chosen view in the address so a reload, or a shared link, opens on the same one. */
export function useDashboardView(): [DashboardView, (view: string) => void] {
    const [view, setView] = useState<DashboardView>(currentView);

    useEffect(() => {
        const follow = () => setView(currentView());
        window.addEventListener("hashchange", follow);
        return () => window.removeEventListener("hashchange", follow);
    }, []);

    const select = useCallback((next: string) => {
        const chosen = next === DashboardView.TEAM ? DashboardView.TEAM : DashboardView.OVERVIEW;
        window.history.replaceState(
            null,
            "",
            chosen === DashboardView.TEAM ? TEAM_FRAGMENT : window.location.pathname
        );
        setView(chosen);
    }, []);

    return [view, select];
}
