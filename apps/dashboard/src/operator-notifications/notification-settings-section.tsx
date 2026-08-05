import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import type { NotificationSettingsView } from "@lab/protocol/operator-notifications/notification-settings.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion } from "#src/design-system/accordion";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import {
    fetchNotificationSettings,
    notificationSettingsQueryKey,
    saveNotificationSettings
} from "#src/operator-notifications/notification-settings-client";
import {
    draftFromSettings,
    hasUnsavedEdits,
    isConfigured,
    isSubmittable,
    settingsSubmission
} from "#src/operator-notifications/notification-settings-draft";
import {
    CHANNELS_HEADING,
    CHANNELS_TITLE,
    FIELD_HINT,
    NOTIFICATIONS_ACTIONS,
    NOTIFICATIONS_FAILURE,
    NOTIFICATIONS_FORM,
    NOTIFICATIONS_PENDING,
    NOTIFICATIONS_SAVED
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";
import type {
    NotificationSettingsDraft,
    NotificationSettingsEdit
} from "#src/operator-notifications/operator-notifications.types";
import { SharedReportSettings } from "#src/operator-notifications/shared-report-settings";
import { TelegramChannelItem } from "#src/operator-notifications/telegram-channel-item";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/**
 * Who the lab reports to. The page edits a draft and hands the whole document over at once, then
 * takes the lab's answer back as the draft: what is on screen after a save is what would actually
 * be delivered. The credentials are the exception in one direction only — they are sent and never
 * served back, so the page shows that one is stored rather than what it is.
 */
export function NotificationSettingsSection() {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const queryClient = useQueryClient();
    const settings = useQuery({
        queryKey: notificationSettingsQueryKey,
        queryFn: ({ signal }) => fetchNotificationSettings(signal),
        retry: false
    });
    const [edited, setEdited] = useState<NotificationSettingsEdit | undefined>(undefined);

    if (settings.data !== undefined && settings.data !== edited?.saved) {
        setEdited({ saved: settings.data, draft: draftFromSettings(settings.data) });
    }

    const save = useMutation({
        mutationFn: (draft: NotificationSettingsDraft) =>
            saveNotificationSettings(settingsSubmission(draft)),
        /**
         * The lab's answer becomes the page in one step rather than through the read noticing it. A
         * document identical to the one already held is handed back as the very object the cache
         * keeps, so waiting for it to look new would leave what was typed on screen for good.
         */
        onSuccess: (stored) => {
            const held =
                queryClient.setQueryData<NotificationSettingsView>(
                    notificationSettingsQueryKey,
                    stored
                ) ?? stored;
            setEdited({ saved: held, draft: draftFromSettings(held) });
        }
    });

    if (edited === undefined) {
        return (
            <Panel title={t("title")} description={t("description")}>
                {settings.isPending ? (
                    <p className={NOTIFICATIONS_PENDING}>
                        <Spinner />
                        {t("pending")}
                    </p>
                ) : (
                    <PanelEmptyState
                        title={t("unsupportedTitle")}
                        description={t("unsupportedDescription")}
                    />
                )}
            </Panel>
        );
    }

    const { draft, saved } = edited;
    const unsaved = hasUnsavedEdits(draft, saved);

    /**
     * An edit puts the page ahead of the lab again, so the answer to the last save stops speaking
     * for what is on screen: neither the refusal nor the confirmation outlives the settings it was
     * given for.
     */
    function change(next: NotificationSettingsDraft) {
        setEdited({ saved, draft: next });
        save.reset();
    }

    return (
        <Panel title={t("title")} description={t("description")}>
            <form
                className={NOTIFICATIONS_FORM}
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate(draft);
                }}
            >
                <SharedReportSettings draft={draft} change={change} />

                <div className={CHANNELS_HEADING}>
                    <h3 className={CHANNELS_TITLE}>{t("channelsTitle")}</h3>
                    <p className={FIELD_HINT}>{t("channelsDescription")}</p>
                </div>

                {/* A channel nobody has set up yet is opened for them: there is nothing to fold away. */}
                <Accordion
                    type="multiple"
                    defaultValue={
                        isConfigured(draft.telegram) ? [] : [NotificationChannelKind.TELEGRAM]
                    }
                >
                    <TelegramChannelItem draft={draft} change={change} unsaved={unsaved} />
                </Accordion>

                {/*
                 * The control is on the page whether or not it can be used. It is the answer to
                 * "have my changes gone in", and a control that disappears once they have leaves
                 * the operator hunting for something that was never missing.
                 */}
                <div className={NOTIFICATIONS_ACTIONS}>
                    {save.isError ? (
                        <p role="alert" className={NOTIFICATIONS_FAILURE}>
                            {t("saveFailure")}
                        </p>
                    ) : null}

                    {save.isSuccess ? (
                        <p className={NOTIFICATIONS_SAVED}>
                            <CheckIcon aria-hidden="true" />
                            {t("saved")}
                        </p>
                    ) : null}

                    <Button
                        type="submit"
                        disabled={!unsaved || save.isPending || !isSubmittable(draft)}
                    >
                        {save.isPending ? <Spinner aria-hidden="true" /> : null}
                        {save.isPending ? t("saving") : t("save")}
                    </Button>
                </div>
            </form>
        </Panel>
    );
}
