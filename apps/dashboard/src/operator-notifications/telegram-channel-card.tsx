import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#src/design-system/card";
import { Input } from "#src/design-system/input";
import { Switch } from "#src/design-system/switch";
import { ChannelTestControl } from "#src/operator-notifications/channel-test-control";
import { MessageLanguageField } from "#src/operator-notifications/message-language-field";
import { isConfigured, isSendable } from "#src/operator-notifications/notification-settings-draft";
import {
    CHANNEL_CARD,
    CHANNEL_CONTENT,
    CHANNEL_HEADING,
    CHANNEL_HEADING_TEXT,
    CHANNEL_STATUS,
    CHANNEL_SWITCH,
    CREDENTIAL_FIELDS,
    FIELD,
    FIELD_HINT,
    FIELD_LABEL
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";
import type { TelegramChannelDraft } from "#src/operator-notifications/operator-notifications.types";
import { ReportedMomentsField } from "#src/operator-notifications/reported-moments-field";

interface TelegramChannelCardProps {
    telegram: TelegramChannelDraft;
    change: (change: Partial<TelegramChannelDraft>) => void;
    chooseMoment: (moment: TelegramChannelDraft["events"][number], chosen: boolean) => void;
    unsaved: boolean;
}

/**
 * One bot writing to one chat. The switch governs the whole card rather than being a field in it,
 * so it sits in the heading: a channel that is set up and silent is a real state, and the operator
 * reaches it without clearing the credentials they took the trouble to enter.
 */
export function TelegramChannelCard({
    telegram,
    change,
    chooseMoment,
    unsaved
}: TelegramChannelCardProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const fieldId = useId();

    return (
        <Card className={CHANNEL_CARD}>
            <CardHeader className={CHANNEL_HEADING}>
                <div className={CHANNEL_HEADING_TEXT}>
                    <CardTitle>{t(NotificationChannelKind.TELEGRAM)}</CardTitle>
                    <CardDescription>{t("telegramDescription")}</CardDescription>
                </div>
                <div className={CHANNEL_HEADING_TEXT}>
                    <label htmlFor={`${fieldId}-enabled`} className={CHANNEL_SWITCH}>
                        <Switch
                            id={`${fieldId}-enabled`}
                            checked={telegram.enabled}
                            onCheckedChange={(enabled) => change({ enabled })}
                        />
                        {t("enabled")}
                    </label>
                    <p className={CHANNEL_STATUS}>{t(channelStatus(telegram))}</p>
                </div>
            </CardHeader>

            <CardContent className={CHANNEL_CONTENT}>
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
                            onChange={(event) => change({ botToken: event.target.value })}
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
                            onChange={(event) => change({ chatId: event.target.value })}
                        />
                        <p className={FIELD_HINT}>{t("chatIdHint")}</p>
                    </div>
                </div>

                <ReportedMomentsField moments={telegram.events} choose={chooseMoment} />

                <MessageLanguageField
                    language={telegram.language}
                    choose={(language) => change({ language })}
                />

                <ChannelTestControl
                    kind={NotificationChannelKind.TELEGRAM}
                    ready={isSendable(telegram)}
                    unsaved={unsaved}
                />
            </CardContent>
        </Card>
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
