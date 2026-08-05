import { Navigate, type RouteObject } from "react-router";
import { INVESTIGATION_ROUTE, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { SettingsView } from "#src/dashboard-routes/settings-view";
import { InvestigationShell } from "#src/investigation-shell/investigation-shell";
import { LabLayout } from "#src/lab-layout/lab-layout";
import { FirstGoal } from "#src/welcome/first-goal";
import { HarnessSetupStep } from "#src/welcome/harness-setup-step";
import { IntroducedRoster } from "#src/welcome/introduced-roster";
import { NotificationSetupStep } from "#src/welcome/notification-setup-step";
import { WelcomeLayout } from "#src/welcome/welcome-layout";
import { WelcomeStep } from "#src/welcome/welcome-steps.const";
import { WhatTheLabIs } from "#src/welcome/what-the-lab-is";

/**
 * Every address opens in the lab's layout. The daemon serves the dashboard for anything that is not
 * the API, so an unknown one reaches the router and is sent to the roster, which is the one page
 * that is always there to land on.
 *
 * The introduction stands outside that layout: a lab nobody has set up yet has no investigations to
 * navigate between, and its sidebar would be a list of empty rooms.
 */
export const dashboardRoutes: RouteObject[] = [
    {
        path: WelcomeStep.LAB,
        element: <WelcomeLayout />,
        children: [
            { index: true, element: <WhatTheLabIs /> },
            { path: WelcomeStep.HARNESSES, element: <HarnessSetupStep /> },
            { path: WelcomeStep.NOTIFICATIONS, element: <NotificationSetupStep /> },
            { path: WelcomeStep.GOAL, element: <FirstGoal /> }
        ]
    },
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
