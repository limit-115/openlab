import { AgentHarnessBilling, HARNESS_BILLING } from "@openlab/protocol/agents/agent-billing.const";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";
import { CheckIcon, CircleAlertIcon, CircleDashedIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { subscriptionPlanName } from "#src/agent-harness/subscription-plan-name";
import { CopyButton } from "#src/clipboard/copy-button";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { DeepseekKeyField } from "#src/harness-setup/deepseek-key-field";
import {
    HARNESS_BILLING_WARNING,
    HARNESS_CARD,
    HARNESS_CARD_ERROR,
    HARNESS_CARD_HEADER,
    HARNESS_CARD_NAME,
    HARNESS_CARD_NOTE,
    HARNESS_CARD_READY,
    HARNESS_CARD_VERSION,
    HARNESS_COMMAND,
    HARNESS_COMMAND_ROW,
    HARNESS_ICON_BROKEN,
    HARNESS_ICON_READY,
    HARNESS_ICON_TODO,
    HARNESS_INSTALL_COMMAND,
    HARNESS_INSTALL_NOTE,
    HARNESS_SIGN_IN_COMMAND,
    HARNESS_SIGN_IN_NOTE
} from "#src/harness-setup/harness-setup.const";
import { HARNESS_SETUP_NAMESPACE } from "#src/harness-setup/harness-setup.i18n";

/**
 * One harness, and the single thing standing between it and a run. A card never asks for more than
 * one command at a time: a page that lists installing and signing in together reads as twice the
 * work, and the second half is not knowable until the first has happened.
 */
export function HarnessReadinessCard({ harness }: { harness: HarnessReadiness }) {
    const { t } = useTranslation(HARNESS_SETUP_NAMESPACE);
    const ready = harness.state === HarnessReadinessState.READY;

    return (
        <li className={cn(HARNESS_CARD, ready && HARNESS_CARD_READY)}>
            <div className={HARNESS_CARD_HEADER}>
                {STATE_ICON[harness.state]}
                <span className={HARNESS_CARD_NAME}>{HARNESS_NAME[harness.harness]}</span>
                <Badge variant={ready ? "default" : "secondary"}>{t(harness.state)}</Badge>
                {HARNESS_BILLING[harness.harness] === AgentHarnessBilling.USAGE ? (
                    <Badge variant="destructive">{t("billingUsage")}</Badge>
                ) : null}
                {harness.plan === null ? null : (
                    <Badge variant="outline">{subscriptionPlanName(harness.plan)}</Badge>
                )}
                {harness.balance === null ? null : (
                    <Badge variant="outline">{harness.balance}</Badge>
                )}
                {harness.cli_version === null ? null : (
                    <span className={HARNESS_CARD_VERSION}>{harness.cli_version}</span>
                )}
            </div>

            {HARNESS_BILLING[harness.harness] === AgentHarnessBilling.USAGE ? (
                <p className={HARNESS_BILLING_WARNING}>{t("billingUsageNote")}</p>
            ) : null}
            <HarnessNextStep harness={harness} />
            {/**
             * The key field stays after the harness is ready, because taking the key back is how the
             * lab is kept from spending the wallet again, and it must not disappear at exactly the
             * moment the lab has started spending it. Only a missing CLI hides it: a key is no use
             * until the binary that spends it is on the machine.
             */}
            {harness.harness === AgentHarnessKind.DEEPSEEK &&
            harness.state !== HarnessReadinessState.NOT_INSTALLED ? (
                <DeepseekKeyField />
            ) : null}
        </li>
    );
}

/** What this operator does next about this harness, which is nothing at all once it is ready. */
function HarnessNextStep({ harness }: { harness: HarnessReadiness }): ReactNode {
    const { t } = useTranslation(HARNESS_SETUP_NAMESPACE);

    if (harness.state === HarnessReadinessState.READY) {
        return null;
    }

    if (harness.state === HarnessReadinessState.UNREADABLE) {
        return <p className={HARNESS_CARD_ERROR}>{harness.error}</p>;
    }

    const installing = harness.state === HarnessReadinessState.NOT_INSTALLED;
    const note = installing
        ? HARNESS_INSTALL_NOTE[harness.harness]
        : HARNESS_SIGN_IN_NOTE[harness.harness];
    const command = installing
        ? HARNESS_INSTALL_COMMAND[harness.harness]
        : HARNESS_SIGN_IN_COMMAND[harness.harness];

    return (
        <>
            <p className={HARNESS_CARD_NOTE}>{t(note)}</p>
            {command === null ? null : (
                <div className={HARNESS_COMMAND_ROW}>
                    <code className={HARNESS_COMMAND}>{command}</code>
                    <CopyButton value={command} label={t("copyCommand")} />
                </div>
            )}
        </>
    );
}

/** Ready, still to do, or broken — three shapes, so the list is read before it is read closely. */
const STATE_ICON: Record<HarnessReadinessState, ReactNode> = {
    [HarnessReadinessState.READY]: <CheckIcon aria-hidden="true" className={HARNESS_ICON_READY} />,
    [HarnessReadinessState.NOT_INSTALLED]: (
        <CircleDashedIcon aria-hidden="true" className={HARNESS_ICON_TODO} />
    ),
    [HarnessReadinessState.NOT_SIGNED_IN]: (
        <CircleDashedIcon aria-hidden="true" className={HARNESS_ICON_TODO} />
    ),
    [HarnessReadinessState.UNREADABLE]: (
        <CircleAlertIcon aria-hidden="true" className={HARNESS_ICON_BROKEN} />
    )
};
