import { RefreshCwIcon, TerminalIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    CENTER_STATE,
    CENTER_STATE_MARK_ERROR,
    COMMAND_HINT,
    COMMAND_HINT_CODE
} from "#src/connection-screen/connection-screen.const";
import { CONNECTION_SCREEN_NAMESPACE } from "#src/connection-screen/connection-screen.i18n";
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
    const { t } = useTranslation(CONNECTION_SCREEN_NAMESPACE);

    return (
        <main className={CENTER_STATE} role="alert">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon" className={CENTER_STATE_MARK_ERROR}>
                        <TriangleAlertIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t("errorTitle")}</EmptyTitle>
                    <EmptyDescription>{error.message}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <span className={COMMAND_HINT}>
                        <TerminalIcon className="size-4 flex-none" aria-hidden="true" />
                        <code className={COMMAND_HINT_CODE}>openlab start task.json</code>
                    </span>
                    <Button type="button" onClick={retry} disabled={retrying}>
                        {retrying ? (
                            <Spinner data-icon="inline-start" />
                        ) : (
                            <RefreshCwIcon data-icon="inline-start" />
                        )}
                        {retrying ? t("retrying") : t("retry")}
                    </Button>
                </EmptyContent>
            </Empty>
        </main>
    );
}
