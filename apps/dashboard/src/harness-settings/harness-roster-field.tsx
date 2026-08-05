import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#src/design-system/card";
import { Checkbox } from "#src/design-system/checkbox";
import { cn } from "#src/design-system/class-names";
import {
    ROSTER_CARD,
    ROSTER_CONTENT,
    ROSTER_OPTION,
    ROSTER_OPTION_CHOSEN,
    ROSTER_OPTIONS,
    SELECTABLE_HARNESSES,
    SETTINGS_FAILURE
} from "#src/harness-settings/harness-settings.const";
import { HARNESS_SETTINGS_NAMESPACE } from "#src/harness-settings/harness-settings.i18n";

interface HarnessRosterFieldProps {
    roster: readonly AgentHarnessKind[];
    choose: (harness: AgentHarnessKind, chosen: boolean) => void;
}

/**
 * The harnesses a new investigation starts on, laid out in the order it will rotate through them.
 * A whole card is the target rather than the box in it, so choosing one is a click anywhere on the
 * harness rather than on a checkbox the size of a full stop.
 */
export function HarnessRosterField({ roster, choose }: HarnessRosterFieldProps) {
    const { t } = useTranslation(HARNESS_SETTINGS_NAMESPACE);
    const rosterId = useId();

    return (
        <Card className={ROSTER_CARD}>
            <CardHeader>
                <CardTitle>{t("rosterLabel")}</CardTitle>
                <CardDescription>{t("rosterHint")}</CardDescription>
            </CardHeader>
            <CardContent className={ROSTER_CONTENT}>
                <ul className={ROSTER_OPTIONS}>
                    {SELECTABLE_HARNESSES.map((harness) => (
                        <li key={harness}>
                            <label
                                htmlFor={`${rosterId}-${harness}`}
                                className={cn(
                                    ROSTER_OPTION,
                                    roster.includes(harness) && ROSTER_OPTION_CHOSEN
                                )}
                            >
                                <Checkbox
                                    id={`${rosterId}-${harness}`}
                                    checked={roster.includes(harness)}
                                    onCheckedChange={(chosen) => choose(harness, chosen === true)}
                                />
                                {HARNESS_NAME[harness]}
                            </label>
                        </li>
                    ))}
                </ul>
                {roster.length === 0 ? (
                    <p role="alert" className={SETTINGS_FAILURE}>
                        {t("rosterRequired")}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}
