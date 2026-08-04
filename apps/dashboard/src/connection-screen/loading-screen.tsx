import { FlaskConicalIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CENTER_STATE } from "#src/connection-screen/connection-screen.const";
import { CONNECTION_SCREEN_NAMESPACE } from "#src/connection-screen/connection-screen.i18n";
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
    const { t } = useTranslation(CONNECTION_SCREEN_NAMESPACE);

    return (
        <main className={CENTER_STATE} aria-busy="true">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FlaskConicalIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t("loadingTitle")}</EmptyTitle>
                    <EmptyDescription>{t("loadingDescription")}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Spinner className="size-5 text-muted-foreground" />
                </EmptyContent>
            </Empty>
        </main>
    );
}
