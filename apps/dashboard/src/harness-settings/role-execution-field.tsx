import type {
    AgentEffortLevel,
    AgentHarnessKind
} from "@lab/protocol/agents/agent-execution.const";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { useId } from "react";
import { Input } from "#src/design-system/input";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    EFFORT_LABEL,
    EFFORT_LEVELS,
    MODEL_PLACEHOLDER,
    ROLE_CARD,
    ROLE_EFFORT,
    ROLE_EFFORT_LABEL,
    ROLE_HEADER,
    ROLE_MODEL_FIELD,
    ROLE_MODEL_LABEL,
    ROLE_MODELS,
    ROLE_NAME,
    SELECTABLE_HARNESSES
} from "#src/harness-settings/harness-settings.const";
import { isEffort } from "#src/harness-settings/harness-settings-draft";

interface RoleExecutionFieldProps {
    role: AgentRole;
    effort: AgentEffortLevel;
    /** The model this role is set to on each harness. An empty one is left to the harness. */
    modelOn: (harness: AgentHarnessKind) => string;
    chooseEffort: (effort: AgentEffortLevel) => void;
    chooseModel: (harness: AgentHarnessKind, model: string) => void;
}

/**
 * One role, as the lab runs it. Effort crosses the vendors unchanged and is set once; a model
 * cannot, so every harness the role may land on gets a field of its own.
 */
export function RoleExecutionField({
    role,
    effort,
    modelOn,
    chooseEffort,
    chooseModel
}: RoleExecutionFieldProps) {
    const fieldId = useId();

    return (
        <li className={ROLE_CARD} aria-labelledby={`${fieldId}-role`}>
            <div className={ROLE_HEADER}>
                <p className={ROLE_NAME} id={`${fieldId}-role`}>
                    {role}
                </p>
                <div className={ROLE_EFFORT}>
                    <span className={ROLE_EFFORT_LABEL} id={`${fieldId}-effort`}>
                        {EFFORT_LABEL}
                    </span>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        spacing={0}
                        value={effort}
                        aria-labelledby={`${fieldId}-effort`}
                        onValueChange={(chosen) => {
                            if (isEffort(chosen)) {
                                chooseEffort(chosen);
                            }
                        }}
                    >
                        {EFFORT_LEVELS.map((level) => (
                            <ToggleGroupItem key={level} value={level} aria-label={level}>
                                {level}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            </div>

            <div className={ROLE_MODELS}>
                {SELECTABLE_HARNESSES.map((harness) => (
                    <div key={harness} className={ROLE_MODEL_FIELD}>
                        <label className={ROLE_MODEL_LABEL} htmlFor={`${fieldId}-${harness}`}>
                            {harness}
                        </label>
                        <Input
                            id={`${fieldId}-${harness}`}
                            value={modelOn(harness)}
                            placeholder={MODEL_PLACEHOLDER}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => chooseModel(harness, event.target.value)}
                        />
                    </div>
                ))}
            </div>
        </li>
    );
}
