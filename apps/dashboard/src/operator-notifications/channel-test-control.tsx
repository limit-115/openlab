import type { NotificationChannelKind } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, SendIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import { testNotificationChannel } from "#src/operator-notifications/notification-settings-client";
import {
    FIELD_HINT,
    NOTIFICATIONS_FAILURE,
    TEST_CONTROL,
    TEST_DELIVERED,
    TEST_REFUSED
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface ChannelTestControlProps {
    kind: NotificationChannelKind;
    /** Held back while the page has edits the lab has not been given, or nothing to send with. */
    ready: boolean;
    unsaved: boolean;
}

/**
 * Writes to the operator through what the lab has stored, so a channel is proved rather than
 * assumed. It goes through the stored credentials rather than the ones on screen: a test that
 * passed on something the lab was never given would prove exactly nothing.
 */
export function ChannelTestControl({ kind, ready, unsaved }: ChannelTestControlProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const attempt = useMutation({ mutationFn: () => testNotificationChannel(kind) });

    return (
        <div className={TEST_CONTROL}>
            <Button
                type="button"
                variant="outline"
                disabled={!ready || unsaved || attempt.isPending}
                onClick={() => attempt.mutate()}
            >
                {attempt.isPending ? (
                    <Spinner aria-hidden="true" />
                ) : (
                    <SendIcon aria-hidden="true" />
                )}
                {attempt.isPending ? t("testing") : t("test")}
            </Button>

            {/*
             * A control the operator cannot use says which of the two things is missing. Sitting
             * there greyed and silent, it reads as broken rather than as waiting.
             */}
            {ready ? null : <p className={FIELD_HINT}>{t("testNeedsSetup")}</p>}
            {ready && unsaved ? <p className={FIELD_HINT}>{t("testNeedsSaving")}</p> : null}

            {attempt.isError ? (
                <p role="alert" className={NOTIFICATIONS_FAILURE}>
                    {t("testFailed")}
                </p>
            ) : null}

            {attempt.data?.delivered === true ? (
                <p className={TEST_DELIVERED}>
                    <CheckIcon aria-hidden="true" />
                    {t("testDelivered")}
                </p>
            ) : null}

            {attempt.data?.delivered === false ? (
                <p role="alert" className={TEST_REFUSED}>
                    {`${t("testRefused")} ${attempt.data.reason ?? ""}`.trim()}
                </p>
            ) : null}
        </div>
    );
}
