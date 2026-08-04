import { Navigate, type RouteObject } from "react-router";
import { InvestigationShell } from "#src/app";
import {
    INVESTIGATION_ROUTE,
    InvestigationView,
    LabRoute
} from "#src/dashboard-routes/dashboard-routes.const";
import { OverviewView } from "#src/dashboard-routes/overview-view";
import { SubscriptionsView } from "#src/dashboard-routes/subscriptions-view";
import { TeamView } from "#src/dashboard-routes/team-view";
import { InvestigationRoster } from "#src/investigation-roster/investigation-roster";
import { LabShell } from "#src/lab-shell/lab-shell";

/**
 * The daemon serves the dashboard for every address that is not the API, so an unknown one reaches
 * the router and is sent to the roster, which is the one page that is always there to land on.
 */
export const dashboardRoutes: RouteObject[] = [
    {
        element: <LabShell />,
        children: [
            { index: true, element: <InvestigationRoster /> },
            { path: LabRoute.SUBSCRIPTIONS, element: <SubscriptionsView /> }
        ]
    },
    {
        path: INVESTIGATION_ROUTE,
        element: <InvestigationShell />,
        children: [
            { index: true, element: <OverviewView /> },
            { path: InvestigationView.TEAM, element: <TeamView /> }
        ]
    },
    { path: "*", element: <Navigate to={LabRoute.ROSTER} replace /> }
];
