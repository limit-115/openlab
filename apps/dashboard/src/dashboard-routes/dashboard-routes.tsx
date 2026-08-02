import { Navigate, type RouteObject } from "react-router";
import { App } from "#src/app";
import { DashboardRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { OverviewView } from "#src/dashboard-routes/overview-view";
import { TeamView } from "#src/dashboard-routes/team-view";

/**
 * The daemon serves the dashboard for every address that is not the API, so an unknown one reaches
 * the router and is sent to the overview instead of resolving to nothing.
 */
export const dashboardRoutes: RouteObject[] = [
    {
        element: <App />,
        children: [
            { index: true, element: <OverviewView /> },
            { path: DashboardRoute.TEAM, element: <TeamView /> },
            { path: "*", element: <Navigate to={DashboardRoute.OVERVIEW} replace /> }
        ]
    }
];
