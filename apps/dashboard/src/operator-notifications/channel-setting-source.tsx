import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import {
    SETTING_SOURCE,
    SETTING_SOURCE_STATE
} from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface ChannelSettingSourceProps {
    follows: boolean;
    choose: (follows: boolean) => void;
}

/**
 * Where one of a channel's settings comes from, and the one move away from it. Following the lab is
 * the ordinary state, so it is said in words beside the label rather than left to be read off a
 * switch: a channel answers this question twice, and two switches carrying the same words say
 * nothing about which of the two questions either of them is answering.
 *
 * A channel that already answered for itself needs no such statement — the controls under the label
 * are the answer — so it is offered only the way back.
 */
export function ChannelSettingSource({ follows, choose }: ChannelSettingSourceProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);

    return (
        <span className={SETTING_SOURCE}>
            {follows ? <span className={SETTING_SOURCE_STATE}>{t("followsLab")}</span> : null}
            <Button type="button" variant="link" size="xs" onClick={() => choose(!follows)}>
                {t(follows ? "setForChannel" : "followLab")}
            </Button>
        </span>
    );
}
