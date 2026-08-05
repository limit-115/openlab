import { useTranslation } from "react-i18next";
import { NightLabMark } from "#src/brand/nightlab-mark";
import { CENTER_STATE, CENTER_STATE_MARK } from "#src/connection-screen/connection-screen.const";
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
                    <EmptyMedia>
                        <NightLabMark className={CENTER_STATE_MARK} />
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
