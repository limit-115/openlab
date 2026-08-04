import { RefreshCwIcon, TerminalIcon, TriangleAlertIcon } from "lucide-react";
import {
    CENTER_STATE,
    CENTER_STATE_MARK_ERROR,
    COMMAND_HINT,
    COMMAND_HINT_CODE
} from "#src/connection-screen/connection-screen.const";
import { Button } from "#src/design-system/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "#src/design-system/empty";
import { Spinner } from "#src/design-system/spinner";

interface ErrorDashboardProps {
    error: Error;
    retry: () => void;
    retrying: boolean;
}

export function ErrorDashboard({ error, retry, retrying }: ErrorDashboardProps) {
    return (
        <main className={CENTER_STATE} role="alert">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon" className={CENTER_STATE_MARK_ERROR}>
                        <TriangleAlertIcon />
                    </EmptyMedia>
                    <EmptyTitle>Could not read investigation status</EmptyTitle>
                    <EmptyDescription>{error.message}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <span className={COMMAND_HINT}>
                        <TerminalIcon className="size-4 flex-none" aria-hidden="true" />
                        <code className={COMMAND_HINT_CODE}>lab start task.json</code>
                    </span>
                    <Button type="button" onClick={retry} disabled={retrying}>
                        {retrying ? (
                            <Spinner data-icon="inline-start" />
                        ) : (
                            <RefreshCwIcon data-icon="inline-start" />
                        )}
                        {retrying ? "Retrying…" : "Retry connection"}
                    </Button>
                </EmptyContent>
            </Empty>
        </main>
    );
}
