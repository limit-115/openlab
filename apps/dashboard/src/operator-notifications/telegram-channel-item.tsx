import { NotificationChannelKind } from "@openlab/protocol/operator-notifications/notification-channel.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { AccordionContent, AccordionItem, AccordionTrigger } from "#src/design-system/accordion";
import { Badge } from "#src/design-system/badge";
import { Input } from "#src/design-system/input";
import { Switch } from "#src/design-system/switch";
import { ChannelSettingSource } from "#src/operator-notifications/channel-setting-source";
import { ChannelTestControl } from "#src/operator-notifications/channel-test-control";
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
    CHANNEL_ANSWERS,
    CHANNEL_ANSWERS_SWITCH,
    CHANNEL_CONTENT,
    CHANNEL_HEADING,
    CHANNEL_NAME,
    CHANNEL_REPORTING,
    CHANNEL_SETUP_TONE,
    CHANNEL_SWITCH,
    CHANNEL_TRIGGER,
    CHANNEL_TRIGGER_TEXT,
    ChannelSetupState,
    CREDENTIAL_FIELDS,
    FIELD,
    FIELD_HINT,
    FIELD_LABEL,
    FOLLOWED_SETTING,
    STORED_TOKEN_MASK
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
 *
 * That line is what the operator actually reads in a list of every place the lab can write, so it
 * carries no words the row beside it would repeat: the tag says what the lab would do with the
 * channel, and the switch is the one thing that changes it.
 */
export function TelegramChannelItem({ draft, change, unsaved }: TelegramChannelItemProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();
    const { telegram } = draft;
    const report = channelReport(draft);
    const followsMoments = telegram.events === undefined;
    const followsLanguage = telegram.language === undefined;
    const setup = channelSetupState(telegram);

    return (
        <AccordionItem value={NotificationChannelKind.TELEGRAM}>
            <div className={CHANNEL_HEADING}>
                <AccordionTrigger className={CHANNEL_TRIGGER}>
                    <span className={CHANNEL_TRIGGER_TEXT}>
                        <span className={CHANNEL_NAME}>{t(NotificationChannelKind.TELEGRAM)}</span>
                        <Badge variant={CHANNEL_SETUP_TONE[setup]}>{t(setup)}</Badge>
                        {followsMoments ? null : <Badge variant="outline">{t("ownMoments")}</Badge>}
                        {followsLanguage ? null : (
                            <Badge variant="outline">{t("ownLanguage")}</Badge>
                        )}
                        {telegram.answersBack ? (
                            <Badge variant="outline">{t("answersBackTag")}</Badge>
                        ) : null}
                    </span>
                </AccordionTrigger>

                {/*
                 * The switch is named to a reader rather than on the row. Ten channels' worth of
                 * the same sentence down the right edge is noise, and the tag beside the name
                 * already reports what flipping it did.
                 */}
                <Switch
                    aria-label={t("enabled")}
                    className={CHANNEL_SWITCH}
                    checked={telegram.enabled}
                    onCheckedChange={(enabled) => change(changeTelegram(draft, { enabled }))}
                />
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
                            placeholder={
                                telegram.botTokenStored
                                    ? STORED_TOKEN_MASK
                                    : t("botTokenPlaceholder")
                            }
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

                {/*
                 * The way in sits with the chat rather than with what the channel reports: it is
                 * the same question the two fields above it answer — who can reach the lab.
                 */}
                <div className={CHANNEL_ANSWERS}>
                    <label htmlFor={`${fieldId}-answers`} className={CHANNEL_ANSWERS_SWITCH}>
                        <Switch
                            id={`${fieldId}-answers`}
                            checked={telegram.answersBack}
                            onCheckedChange={(answersBack) =>
                                change(changeTelegram(draft, { answersBack }))
                            }
                        />
                        {t("answersBack")}
                    </label>
                    <p className={FIELD_HINT}>{t("answersBackHint")}</p>
                </div>

                <div className={CHANNEL_REPORTING}>
                    <NotificationField
                        label={t("moments")}
                        aside={
                            <ChannelSettingSource
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
                            <ChannelSettingSource
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
                </div>

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
function channelSetupState(telegram: TelegramChannelDraft): ChannelSetupState {
    if (!isConfigured(telegram)) {
        return ChannelSetupState.NOT_CONFIGURED;
    }
    return telegram.enabled ? ChannelSetupState.CONFIGURED_ON : ChannelSetupState.CONFIGURED_OFF;
}
