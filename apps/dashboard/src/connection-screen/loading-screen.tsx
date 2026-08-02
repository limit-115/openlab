import { FlaskConicalIcon } from "lucide-react";
import { CENTER_STATE } from "#src/connection-screen/connection-screen.const";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "#src/design-system/empty";
import { Spinner } from "#src/design-system/spinner";

export function LoadingDashboard() {
    return (
        <main className={CENTER_STATE} aria-busy="true">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FlaskConicalIcon />
                    </EmptyMedia>
                    <EmptyTitle>Connecting to the lab</EmptyTitle>
                    <EmptyDescription>
                        Reading the current frontier and opening the live event stream…
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Spinner className="size-5 text-muted-foreground" />
                </EmptyContent>
            </Empty>
        </main>
    );
}
