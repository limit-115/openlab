import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "#src/app";
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

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <App />
            </TooltipProvider>
        </QueryClientProvider>
    </StrictMode>
);
