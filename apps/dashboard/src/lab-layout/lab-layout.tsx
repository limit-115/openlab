import { Outlet } from "react-router";
import { cn } from "#src/design-system/class-names";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#src/design-system/sidebar";
import {
    LAYOUT_BAR,
    LAYOUT_BAR_ROW,
    LAYOUT_BODY,
    LAYOUT_FRAME,
    LAYOUT_INSET,
    LAYOUT_SCROLLER,
    LAYOUT_WRAPPER
} from "#src/lab-layout/lab-layout.const";
import { LabSidebar } from "#src/lab-layout/lab-sidebar";
import { ModeToggle } from "#src/theme/mode-toggle";

/** The one layout every page of the lab opens in: the sidebar, and the inset beside it. */
export function LabLayout() {
    return (
        <SidebarProvider className={LAYOUT_WRAPPER}>
            <LabSidebar />
            <SidebarInset className={LAYOUT_INSET}>
                <header className={LAYOUT_BAR}>
                    <div className={cn(LAYOUT_FRAME, LAYOUT_BAR_ROW)}>
                        <SidebarTrigger className="-ml-1" />
                        <ModeToggle />
                    </div>
                </header>
                <main className={cn(LAYOUT_SCROLLER, LAYOUT_FRAME, LAYOUT_BODY)}>
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
