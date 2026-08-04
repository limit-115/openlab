import { Outlet } from "react-router";
import { APP_SHELL, INSET_FRAME, PAGE_BODY } from "#src/app.const";
import { AppSidebar } from "#src/design-system/app-sidebar";
import { cn } from "#src/design-system/class-names";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#src/design-system/sidebar";
import {
    INVESTIGATION_HEADER_BAR,
    INVESTIGATION_HEADER_ROW
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
                        <ModeToggle />
                    </div>
                </header>
                <main className={cn(INSET_FRAME, PAGE_BODY)}>
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
