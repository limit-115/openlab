import { FlaskConicalIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { APP_FOOTER, APP_SHELL, PAGE_FRAME } from "#src/app.const";
import { LAB_VIEWS } from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import {
    INVESTIGATION_HEADER_BAR,
    INVESTIGATION_HEADER_ROW,
    INVESTIGATION_HEADER_VIEW,
    INVESTIGATION_HEADER_VIEW_CURRENT,
    INVESTIGATION_HEADER_VIEWS
} from "#src/investigation-header/investigation-header.const";
import { LAB_NAME, LAB_SUBTITLE } from "#src/lab-shell/lab-shell.const";
import { ModeToggle } from "#src/theme/mode-toggle";

/** The shell for what belongs to the lab rather than to one investigation. */
export function LabShell() {
    return (
        <div className={APP_SHELL}>
            <header className={INVESTIGATION_HEADER_BAR}>
                <div className={cn(PAGE_FRAME, INVESTIGATION_HEADER_ROW)}>
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            className="grid size-9 flex-none place-items-center rounded-xl bg-primary/10 text-primary"
                            aria-hidden="true"
                        >
                            <FlaskConicalIcon className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-base font-semibold">{LAB_NAME}</p>
                            <p className="text-sm break-words text-muted-foreground">
                                {LAB_SUBTITLE}
                            </p>
                        </div>
                    </div>

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
            <main className={PAGE_FRAME}>
                <Outlet />
            </main>
            <footer className={cn(PAGE_FRAME, APP_FOOTER)}>
                <span>AI Research Lab · Local runtime</span>
            </footer>
        </div>
    );
}
