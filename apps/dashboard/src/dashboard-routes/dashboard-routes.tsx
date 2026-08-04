import { Navigate, type RouteObject } from "react-router";
import {
    INVESTIGATION_ROUTE,
    InvestigationView,
    LabRoute
} from "#src/dashboard-routes/dashboard-routes.const";
import { OverviewView } from "#src/dashboard-routes/overview-view";
import { SettingsView } from "#src/dashboard-routes/settings-view";
import { TeamView } from "#src/dashboard-routes/team-view";
import { InvestigationRoster } from "#src/investigation-roster/investigation-roster";
import { InvestigationShell } from "#src/investigation-shell/investigation-shell";
import { LabLayout } from "#src/lab-layout/lab-layout";

/**
 * Every address opens in the lab's layout. The daemon serves the dashboard for anything that is not
 * the API, so an unknown one reaches the router and is sent to the roster, which is the one page
 * that is always there to land on.
 */
export const dashboardRoutes: RouteObject[] = [
    {
        element: <LabLayout />,
        children: [
            { index: true, element: <InvestigationRoster /> },
            { path: LabRoute.SETTINGS, element: <SettingsView /> },
            {
                path: INVESTIGATION_ROUTE,
                element: <InvestigationShell />,
                children: [
                    { index: true, element: <OverviewView /> },
                    { path: InvestigationView.TEAM, element: <TeamView /> }
                ]
            },
            { path: "*", element: <Navigate to={LabRoute.ROSTER} replace /> }
        ]
    }
];
