import { NavLink, Outlet } from "react-router";
import { APP_FOOTER, APP_SHELL, INSET_FRAME, PAGE_BODY } from "#src/app.const";
import { LAB_VIEWS } from "#src/dashboard-routes/dashboard-routes.const";
import { AppSidebar } from "#src/design-system/app-sidebar";
import { cn } from "#src/design-system/class-names";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#src/design-system/sidebar";
import {
    INVESTIGATION_HEADER_BAR,
    INVESTIGATION_HEADER_ROW,
    INVESTIGATION_HEADER_VIEW,
    INVESTIGATION_HEADER_VIEW_CURRENT,
    INVESTIGATION_HEADER_VIEWS
} from "#src/investigation-header/investigation-header.const";
import { ModeToggle } from "#src/theme/mode-toggle";

/** The shell for what belongs to the lab rather than to one investigation. */
export function LabShell() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={APP_SHELL}>
                <header className={INVESTIGATION_HEADER_BAR}>
                    <div className={cn(INSET_FRAME, INVESTIGATION_HEADER_ROW)}>
                        <SidebarTrigger className="-ml-1" />

                        <nav className={INVESTIGATION_HEADER_VIEWS} aria-label="Views">
                            {LAB_VIEWS.map((view) => (
                                <NavLink
                                    key={view.route}
                                    to={view.route}
                                    end
                                    className={({ isActive }) =>
                                        cn(
                                            INVESTIGATION_HEADER_VIEW,
                                            isActive && INVESTIGATION_HEADER_VIEW_CURRENT
                                        )
                                    }
                                >
                                    {view.label}
                                </NavLink>
                            ))}
                        </nav>

                        <ModeToggle />
                    </div>
                </header>
                <main className={cn(INSET_FRAME, PAGE_BODY)}>
                    <Outlet />
                </main>
                <footer className={cn(INSET_FRAME, APP_FOOTER)}>
                    <span>AI Research Lab · Local runtime</span>
                </footer>
            </SidebarInset>
        </SidebarProvider>
    );
}
