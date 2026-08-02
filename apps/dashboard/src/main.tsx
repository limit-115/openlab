import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { dashboardRoutes } from "#src/dashboard-routes/dashboard-routes";
import { TooltipProvider } from "#src/design-system/tooltip";
import "#src/tailwind.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Dashboard root element is missing.");
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 5 * 60_000,
            networkMode: "always"
        }
    }
});

const router = createBrowserRouter(dashboardRoutes);

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <RouterProvider router={router} />
            </TooltipProvider>
        </QueryClientProvider>
    </StrictMode>
);
