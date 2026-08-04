import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "@lab/protocol/investigation-input/investigation-input.const";
import { type FormEvent, useId, useState } from "react";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import { Textarea } from "#src/design-system/textarea";
import { ToggleGroup, ToggleGroupItem } from "#src/design-system/toggle-group";
import {
    CONTEXT_HINT,
    CONTEXT_LABEL,
    CONTEXT_PLACEHOLDER,
    CRITERIA_HINT,
    CRITERIA_LABEL,
    CRITERIA_PLACEHOLDER,
    FORM,
    FORM_FAILURE,
    FORM_FIELD,
    FORM_HINT,
    FORM_LABEL,
    FORM_ROW,
    GOAL_HINT,
    GOAL_LABEL,
    GOAL_PLACEHOLDER,
    HARNESS_HINT,
    HARNESS_LABEL,
    HARNESS_REQUIRED,
    NEW_INVESTIGATION_LABEL,
    STARTING_INVESTIGATION_LABEL
} from "#src/investigation-roster/investigation-roster.const";
import type { NewInvestigation } from "#src/investigation-roster/investigation-roster.types";

interface NewInvestigationFormProps {
    start: (investigation: NewInvestigation) => void;
    starting: boolean;
    failure?: string;
}

const SELECTABLE_HARNESSES = Object.values(AgentHarnessKind);

function lines(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

/**
 * What the operator hands the lab. Only the goal is required: the rest sharpens the director's
 * first round, and an investigation started with nothing but a goal is a complete one.
 */
export function NewInvestigationForm({ start, starting, failure }: NewInvestigationFormProps) {
    const goalId = useId();
    const contextId = useId();
    const criteriaId = useId();
    const [goal, setGoal] = useState("");
    const [context, setContext] = useState("");
    const [criteria, setCriteria] = useState("");
    const [harnesses, setHarnesses] = useState<string[]>([...DEFAULT_HARNESS_KINDS]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const contextLines = lines(context);
        const criteriaLines = lines(criteria);
        start({
            goal: goal.trim(),
            ...(contextLines.length === 0 ? {} : { context: contextLines }),
            ...(criteriaLines.length === 0 ? {} : { success_criteria: criteriaLines }),
            harness_kinds: harnesses as AgentHarnessKind[]
        });
    }

    const rosterIsEmpty = harnesses.length === 0;

    return (
        <form className={FORM} onSubmit={submit} noValidate>
            <div className={FORM_FIELD}>
                <label className={FORM_LABEL} htmlFor={goalId}>
                    {GOAL_LABEL}
                </label>
                <Textarea
                    id={goalId}
                    value={goal}
                    placeholder={GOAL_PLACEHOLDER}
                    onChange={(event) => setGoal(event.target.value)}
                />
                <p className={FORM_HINT}>{GOAL_HINT}</p>
            </div>

            <div className={FORM_FIELD}>
                <label className={FORM_LABEL} htmlFor={contextId}>
                    {CONTEXT_LABEL}
                </label>
                <Textarea
                    id={contextId}
                    value={context}
                    placeholder={CONTEXT_PLACEHOLDER}
                    onChange={(event) => setContext(event.target.value)}
                />
                <p className={FORM_HINT}>{CONTEXT_HINT}</p>
            </div>

            <div className={FORM_FIELD}>
                <label className={FORM_LABEL} htmlFor={criteriaId}>
                    {CRITERIA_LABEL}
                </label>
                <Textarea
                    id={criteriaId}
                    value={criteria}
                    placeholder={CRITERIA_PLACEHOLDER}
                    onChange={(event) => setCriteria(event.target.value)}
                />
                <p className={FORM_HINT}>{CRITERIA_HINT}</p>
            </div>

            <div className={FORM_FIELD}>
                <p className={FORM_LABEL}>{HARNESS_LABEL}</p>
                <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={harnesses}
                    onValueChange={setHarnesses}
                    aria-label={HARNESS_LABEL}
                >
                    {SELECTABLE_HARNESSES.map((kind) => (
                        <ToggleGroupItem key={kind} value={kind} aria-label={kind}>
                            {kind}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <p className={FORM_HINT}>{rosterIsEmpty ? HARNESS_REQUIRED : HARNESS_HINT}</p>
            </div>

            <div className={FORM_ROW}>
                <Button
                    type="submit"
                    disabled={starting || goal.trim().length === 0 || rosterIsEmpty}
                >
                    {starting ? <Spinner aria-hidden="true" /> : null}
                    {starting ? STARTING_INVESTIGATION_LABEL : NEW_INVESTIGATION_LABEL}
                </Button>
            </div>

            {failure === undefined ? null : (
                <p role="alert" className={FORM_FAILURE}>
                    {failure}
                </p>
            )}
        </form>
    );
}
