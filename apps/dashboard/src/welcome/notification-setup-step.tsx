import { NotificationChannelKind } from "@openlab/protocol/operator-notifications/notification-channel.const";
import type { NotificationSettingsView } from "@openlab/protocol/operator-notifications/notification-settings.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import { Input } from "#src/design-system/input";
import { Spinner } from "#src/design-system/spinner";
import { ChannelTestControl } from "#src/operator-notifications/channel-test-control";
import {
    fetchNotificationSettings,
    notificationSettingsQueryKey,
    saveNotificationSettings
} from "#src/operator-notifications/notification-settings-client";
import {
    changeTelegram,
    draftFromSettings,
    hasUnsavedEdits,
    isSendable,
    isSubmittable,
    settingsSubmission
} from "#src/operator-notifications/notification-settings-draft";
import {
    CREDENTIAL_FIELDS,
    FIELD,
    FIELD_HINT,
    FIELD_LABEL,
    NOTIFICATIONS_ACTIONS,
    NOTIFICATIONS_FAILURE,
    NOTIFICATIONS_PENDING,
    NOTIFICATIONS_SAVED,
    STORED_TOKEN_MASK
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";
import type {
    NotificationSettingsDraft,
    NotificationSettingsEdit
} from "#src/operator-notifications/operator-notifications.types";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { WELCOME_LEAD, WELCOME_ROLE_WORK, WELCOME_TITLE } from "#src/welcome/welcome.const";
import { WELCOME_NAMESPACE } from "#src/welcome/welcome.i18n";
import { WelcomeNavigation } from "#src/welcome/welcome-navigation";

/**
 * Where the lab writes when something happens while nobody is watching. The step asks for the two
 * things a channel cannot work without and leaves every other question at what the lab already
 * answers: what to report and in which language are settings worth changing once, not while being
 * introduced to the thing that reports.
 *
 * Everything under it is the notification settings page's own, so a channel set up here is the same
 * channel that page edits afterwards rather than a second way of saying the same thing.
 */
export function NotificationSetupStep() {
    const { t } = useTranslation(WELCOME_NAMESPACE);
    const { t: channel } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();
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
        /** Filling this in during the setup is asking for it to be on; the settings page turns it off. */
        mutationFn: (draft: NotificationSettingsDraft) =>
            saveNotificationSettings(settingsSubmission(changeTelegram(draft, { enabled: true }))),
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
            <>
                <h1 className={WELCOME_TITLE}>{t("notificationsTitle")}</h1>
                {settings.isPending ? (
                    <p className={NOTIFICATIONS_PENDING}>
                        <Spinner />
                        {channel("pending")}
                    </p>
                ) : (
                    <PanelEmptyState
                        title={channel("unsupportedTitle")}
                        description={channel("unsupportedDescription")}
                    />
                )}
                <WelcomeNavigation continueLabel={t("skipStep")} />
            </>
        );
    }

    const { draft, saved } = edited;
    const unsaved = hasUnsavedEdits(draft, saved);
    const { telegram } = draft;
    /** What the lab is actually holding, which is the only thing a save has changed about it. */
    const holdsChannel = saved.channels.length > 0;

    function change(next: NotificationSettingsDraft) {
        setEdited({ saved, draft: next });
        save.reset();
    }

    return (
        <>
            <h1 className={WELCOME_TITLE}>{t("notificationsTitle")}</h1>
            <p className={WELCOME_LEAD}>{t("notificationsLead")}</p>
            <p className={FIELD_HINT}>{channel("telegramDescription")}</p>

            <div className={CREDENTIAL_FIELDS}>
                <div className={FIELD}>
                    <label htmlFor={`${fieldId}-token`} className={FIELD_LABEL}>
                        {channel("botToken")}
                    </label>
                    <Input
                        id={`${fieldId}-token`}
                        value={telegram.botToken}
                        placeholder={
                            telegram.botTokenStored
                                ? STORED_TOKEN_MASK
                                : channel("botTokenPlaceholder")
                        }
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) =>
                            change(changeTelegram(draft, { botToken: event.target.value }))
                        }
                    />
                    <p className={FIELD_HINT}>
                        {telegram.botTokenStored
                            ? channel("botTokenStored")
                            : channel("botTokenHint")}
                    </p>
                </div>

                <div className={FIELD}>
                    <label htmlFor={`${fieldId}-chat`} className={FIELD_LABEL}>
                        {channel("chatId")}
                    </label>
                    <Input
                        id={`${fieldId}-chat`}
                        value={telegram.chatId}
                        placeholder={channel("chatIdPlaceholder")}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) =>
                            change(changeTelegram(draft, { chatId: event.target.value }))
                        }
                    />
                    <p className={FIELD_HINT}>{channel("chatIdHint")}</p>
                </div>
            </div>

            <div className={NOTIFICATIONS_ACTIONS}>
                {save.isError ? (
                    <p role="alert" className={NOTIFICATIONS_FAILURE}>
                        {channel("saveFailure")}
                    </p>
                ) : null}

                {save.isSuccess ? (
                    <p className={NOTIFICATIONS_SAVED}>
                        <CheckIcon aria-hidden="true" />
                        {channel("saved")}
                    </p>
                ) : null}

                <Button
                    type="button"
                    disabled={!unsaved || save.isPending || !isSubmittable(draft)}
                    onClick={() => save.mutate(draft)}
                >
                    {save.isPending ? <Spinner aria-hidden="true" /> : null}
                    {save.isPending ? channel("saving") : channel("save")}
                </Button>
            </div>

            {/* Proving the channel is the point of setting one up here: a lab that cannot reach the
             * operator is discovered at the moment it had something to say, which is the worst
             * possible moment to discover it. */}
            <ChannelTestControl
                kind={NotificationChannelKind.TELEGRAM}
                ready={isSendable(draft)}
                unsaved={unsaved}
            />

            <p className={WELCOME_ROLE_WORK}>{t("notificationsOptional")}</p>

            {/*
             * Going on is only continuing once the lab has somewhere to write. Until then the
             * button is a skip and says so: this step is the one thing in the introduction that can
             * be left undone without consequence, and a "Continue" that quietly leaves it undone
             * would be the setup claiming work it did not do.
             */}
            <WelcomeNavigation {...(holdsChannel ? {} : { continueLabel: t("skipStep") })}>
                {unsaved ? <p className={FIELD_HINT}>{t("notificationsUnsaved")}</p> : null}
            </WelcomeNavigation>
        </>
    );
}
