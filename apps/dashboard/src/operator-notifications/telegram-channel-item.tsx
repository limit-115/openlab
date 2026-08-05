import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { AccordionContent, AccordionItem, AccordionTrigger } from "#src/design-system/accordion";
import { Badge } from "#src/design-system/badge";
import { Input } from "#src/design-system/input";
import { Switch } from "#src/design-system/switch";
import { ChannelTestControl } from "#src/operator-notifications/channel-test-control";
import { FollowsLabSwitch } from "#src/operator-notifications/follows-lab-switch";
import { MessageLanguageOptions } from "#src/operator-notifications/message-language-options";
import { NotificationField } from "#src/operator-notifications/notification-field";
import {
    changeTelegram,
    channelReport,
    chooseChannelMoment,
    followLabLanguage,
    followLabMoments,
    isConfigured,
    isSendable
} from "#src/operator-notifications/notification-settings-draft";
import {
    CHANNEL_CONTENT,
    CHANNEL_HEADING,
    CHANNEL_STATUS,
    CHANNEL_SWITCH,
    CHANNEL_TRIGGER,
    CHANNEL_TRIGGER_TEXT,
    CREDENTIAL_FIELDS,
    FIELD,
    FIELD_HINT,
    FIELD_LABEL,
    FOLLOWED_SETTING
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";
import type {
    NotificationSettingsDraft,
    TelegramChannelDraft
} from "#src/operator-notifications/operator-notifications.types";
import {
    FollowedMoments,
    ReportedMomentsOptions
} from "#src/operator-notifications/reported-moments";

interface TelegramChannelItemProps {
    draft: NotificationSettingsDraft;
    change: (next: NotificationSettingsDraft) => void;
    unsaved: boolean;
}

/**
 * One bot writing to one chat. The credentials are a once-off and the settings under them are
 * usually the lab's, so the whole of it folds away behind a line saying what the channel does; the
 * switch stays out on that line, because a channel that is set up and silent is a real state and
 * reaching it should not cost the operator the credentials they took the trouble to enter.
 */
export function TelegramChannelItem({ draft, change, unsaved }: TelegramChannelItemProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();
    const { telegram } = draft;
    const report = channelReport(draft);
    const followsMoments = telegram.events === undefined;
    const followsLanguage = telegram.language === undefined;

    return (
        <AccordionItem value={NotificationChannelKind.TELEGRAM}>
            <div className={CHANNEL_HEADING}>
                <AccordionTrigger className={CHANNEL_TRIGGER}>
                    <span className={CHANNEL_TRIGGER_TEXT}>
                        {t(NotificationChannelKind.TELEGRAM)}
                        <span className={CHANNEL_STATUS}>{t(channelStatus(telegram))}</span>
                        {followsMoments ? null : (
                            <Badge variant="secondary">{t("ownMoments")}</Badge>
                        )}
                        {followsLanguage ? null : (
                            <Badge variant="secondary">{t("ownLanguage")}</Badge>
                        )}
                    </span>
                </AccordionTrigger>

                <label htmlFor={`${fieldId}-enabled`} className={CHANNEL_SWITCH}>
                    <Switch
                        id={`${fieldId}-enabled`}
                        checked={telegram.enabled}
                        onCheckedChange={(enabled) => change(changeTelegram(draft, { enabled }))}
                    />
                    {t("enabled")}
                </label>
            </div>

            <AccordionContent className={CHANNEL_CONTENT}>
                <p className={FIELD_HINT}>{t("telegramDescription")}</p>

                <div className={CREDENTIAL_FIELDS}>
                    <div className={FIELD}>
                        <label htmlFor={`${fieldId}-token`} className={FIELD_LABEL}>
                            {t("botToken")}
                        </label>
                        <Input
                            id={`${fieldId}-token`}
                            value={telegram.botToken}
                            placeholder={t("botTokenPlaceholder")}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) =>
                                change(changeTelegram(draft, { botToken: event.target.value }))
                            }
                        />
                        <p className={FIELD_HINT}>
                            {telegram.botTokenStored ? t("botTokenStored") : t("botTokenHint")}
                        </p>
                    </div>

                    <div className={FIELD}>
                        <label htmlFor={`${fieldId}-chat`} className={FIELD_LABEL}>
                            {t("chatId")}
                        </label>
                        <Input
                            id={`${fieldId}-chat`}
                            value={telegram.chatId}
                            placeholder={t("chatIdPlaceholder")}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) =>
                                change(changeTelegram(draft, { chatId: event.target.value }))
                            }
                        />
                        <p className={FIELD_HINT}>{t("chatIdHint")}</p>
                    </div>
                </div>

                <NotificationField
                    label={t("moments")}
                    aside={
                        <FollowsLabSwitch
                            follows={followsMoments}
                            choose={(follows) => change(followLabMoments(draft, follows))}
                        />
                    }
                >
                    {followsMoments ? (
                        <FollowedMoments moments={report.events} />
                    ) : (
                        <ReportedMomentsOptions
                            moments={report.events}
                            choose={(moment, chosen) =>
                                change(chooseChannelMoment(draft, moment, chosen))
                            }
                        />
                    )}
                </NotificationField>

                <NotificationField
                    label={t("language")}
                    aside={
                        <FollowsLabSwitch
                            follows={followsLanguage}
                            choose={(follows) => change(followLabLanguage(draft, follows))}
                        />
                    }
                >
                    {followsLanguage ? (
                        <p className={FOLLOWED_SETTING}>{t(report.language)}</p>
                    ) : (
                        <MessageLanguageOptions
                            language={report.language}
                            choose={(language) => change(changeTelegram(draft, { language }))}
                        />
                    )}
                </NotificationField>

                <ChannelTestControl
                    kind={NotificationChannelKind.TELEGRAM}
                    ready={isSendable(draft)}
                    unsaved={unsaved}
                />
            </AccordionContent>
        </AccordionItem>
    );
}

/** What the lab would actually do with this channel as it currently stands. */
function channelStatus(
    telegram: TelegramChannelDraft
): "notConfigured" | "configuredOn" | "configuredOff" {
    if (!isConfigured(telegram)) {
        return "notConfigured";
    }
    return telegram.enabled ? "configuredOn" : "configuredOff";
}
