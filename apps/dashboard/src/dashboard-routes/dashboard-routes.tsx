import { Navigate, type RouteObject } from "react-router";
import { INVESTIGATION_ROUTE, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { SettingsView } from "#src/dashboard-routes/settings-view";
import { InvestigationShell } from "#src/investigation-shell/investigation-shell";
import { LabLayout } from "#src/lab-layout/lab-layout";
import { IntroducedRoster } from "#src/welcome/introduced-roster";
import { WELCOME_ROUTE } from "#src/welcome/welcome.const";
import { WelcomeView } from "#src/welcome/welcome-view";

/**
 * Every address opens in the lab's layout. The daemon serves the dashboard for anything that is not
 * the API, so an unknown one reaches the router and is sent to the roster, which is the one page
 * that is always there to land on.
 */
export const dashboardRoutes: RouteObject[] = [
    { path: WELCOME_ROUTE, element: <WelcomeView /> },
    {
        element: <LabLayout />,
        children: [
            { index: true, element: <IntroducedRoster /> },
            { path: LabRoute.SETTINGS, element: <SettingsView /> },
            { path: INVESTIGATION_ROUTE, element: <InvestigationShell /> },
            { path: "*", element: <Navigate to={LabRoute.ROSTER} replace /> }
        ]
    }
];
