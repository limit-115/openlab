import type { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { useId } from "react";
import { Checkbox } from "#src/design-system/checkbox";
import {
    ROSTER_HINT,
    ROSTER_LABEL,
    ROSTER_LEGEND,
    ROSTER_OPTION,
    ROSTER_OPTION_NAME,
    ROSTER_OPTIONS,
    ROSTER_REQUIRED,
    SELECTABLE_HARNESSES,
    SETTINGS_FIELD,
    SETTINGS_HINT
} from "#src/harness-settings/harness-settings.const";

interface HarnessRosterFieldProps {
    roster: readonly AgentHarnessKind[];
    choose: (harness: AgentHarnessKind, chosen: boolean) => void;
}

/** The harnesses a new investigation starts on, and the order it will rotate through them in. */
export function HarnessRosterField({ roster, choose }: HarnessRosterFieldProps) {
    const rosterId = useId();

    return (
        <fieldset className={SETTINGS_FIELD}>
            <legend className={ROSTER_LEGEND}>{ROSTER_LABEL}</legend>
            <div className={ROSTER_OPTIONS}>
                {SELECTABLE_HARNESSES.map((harness) => (
                    <div key={harness} className={ROSTER_OPTION}>
                        <Checkbox
                            id={`${rosterId}-${harness}`}
                            checked={roster.includes(harness)}
                            onCheckedChange={(chosen) => choose(harness, chosen === true)}
                        />
                        <label className={ROSTER_OPTION_NAME} htmlFor={`${rosterId}-${harness}`}>
                            {harness}
                        </label>
                    </div>
                ))}
            </div>
            <p className={SETTINGS_HINT}>{roster.length === 0 ? ROSTER_REQUIRED : ROSTER_HINT}</p>
        </fieldset>
    );
}
