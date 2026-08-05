import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "#src/design-system/switch";
import { FOLLOWS_LAB_SWITCH } from "#src/operator-notifications/operator-notifications.const";
import { OPERATOR_NOTIFICATIONS_NAMESPACE } from "#src/operator-notifications/operator-notifications.i18n";

interface FollowsLabSwitchProps {
    follows: boolean;
    choose: (follows: boolean) => void;
}

/**
 * Whether this channel takes the lab's word on one setting. It reads the same beside either
 * setting on purpose: which one is being answered comes from the field it sits on, and the operator
 * is answering the same question twice rather than learning two controls.
 */
export function FollowsLabSwitch({ follows, choose }: FollowsLabSwitchProps) {
    const { t } = useTranslation(OPERATOR_NOTIFICATIONS_NAMESPACE);
    const switchId = useId();

    return (
        <label htmlFor={switchId} className={FOLLOWS_LAB_SWITCH}>
            <Switch id={switchId} checked={follows} onCheckedChange={choose} />
            {t("followsLab")}
        </label>
    );
}
