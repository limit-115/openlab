import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "@lab/protocol/investigation-input/investigation-input.const";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { Button } from "#src/design-system/button";
import { Checkbox } from "#src/design-system/checkbox";
import { Spinner } from "#src/design-system/spinner";
import { Textarea } from "#src/design-system/textarea";
import {
    fetchLabSettings,
    labSettingsQueryKey
} from "#src/harness-settings/harness-settings-client";
import {
    CANCEL_LABEL,
    CONTEXT_HINT,
    CONTEXT_LABEL,
    CONTEXT_PLACEHOLDER,
    CRITERIA_HINT,
    CRITERIA_LABEL,
    CRITERIA_PLACEHOLDER,
    FORM,
    FORM_FAILURE,
    FORM_FIELD,
    FORM_FIELDS,
    FORM_HINT,
    FORM_LABEL,
    FORM_ROW,
    GOAL_HINT,
    GOAL_LABEL,
    GOAL_PLACEHOLDER,
    HARNESS_HINT,
    HARNESS_LABEL,
    HARNESS_LEGEND,
    HARNESS_OPTION,
    HARNESS_OPTION_NAME,
    HARNESS_OPTIONS,
    HARNESS_REQUIRED,
    START_INVESTIGATION_LABEL,
    STARTING_INVESTIGATION_LABEL
} from "#src/investigation-roster/investigation-roster.const";
import type { NewInvestigation } from "#src/investigation-roster/investigation-roster.types";

interface NewInvestigationFormProps {
    start: (investigation: NewInvestigation) => void;
    starting: boolean;
    cancel: () => void;
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
export function NewInvestigationForm({
    start,
    starting,
    cancel,
    failure
}: NewInvestigationFormProps) {
    const goalId = useId();
    const contextId = useId();
    const criteriaId = useId();
    const harnessId = useId();
    const [goal, setGoal] = useState("");
    const [context, setContext] = useState("");
    const [criteria, setCriteria] = useState("");
    /**
     * Untouched, the roster is the lab's own: the boxes show what the lab would start this
     * investigation on, and the request leaves the field out so the lab fills it in as it stands
     * when the investigation opens. Ticking a box makes the roster this operator's instead.
     */
    const [chosenHarnesses, setChosenHarnesses] = useState<AgentHarnessKind[] | undefined>(
        undefined
    );
    const labSettings = useQuery({
        queryKey: labSettingsQueryKey,
        queryFn: ({ signal }) => fetchLabSettings(signal),
        retry: false
    });
    const harnesses = chosenHarnesses ??
        labSettings.data?.harness_roster ?? [...DEFAULT_HARNESS_KINDS];

    /** The roster keeps the listed order however the boxes are ticked, because dispatch follows it. */
    function chooseHarness(kind: AgentHarnessKind, chosen: boolean) {
        setChosenHarnesses(
            SELECTABLE_HARNESSES.filter((candidate) =>
                candidate === kind ? chosen : harnesses.includes(candidate)
            )
        );
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const contextLines = lines(context);
        const criteriaLines = lines(criteria);
        start({
            goal: goal.trim(),
            ...(contextLines.length === 0 ? {} : { context: contextLines }),
            ...(criteriaLines.length === 0 ? {} : { success_criteria: criteriaLines }),
            ...(chosenHarnesses === undefined ? {} : { harness_kinds: chosenHarnesses })
        });
    }

    const rosterIsEmpty = harnesses.length === 0;

    return (
        <form className={FORM} onSubmit={submit} noValidate>
            <div className={FORM_FIELDS}>
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

                <fieldset className={FORM_FIELD}>
                    <legend className={HARNESS_LEGEND}>{HARNESS_LABEL}</legend>
                    <div className={HARNESS_OPTIONS}>
                        {SELECTABLE_HARNESSES.map((kind) => (
                            <div key={kind} className={HARNESS_OPTION}>
                                <Checkbox
                                    id={`${harnessId}-${kind}`}
                                    checked={harnesses.includes(kind)}
                                    onCheckedChange={(chosen) =>
                                        chooseHarness(kind, chosen === true)
                                    }
                                />
                                <label
                                    className={HARNESS_OPTION_NAME}
                                    htmlFor={`${harnessId}-${kind}`}
                                >
                                    {kind}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className={FORM_HINT}>{rosterIsEmpty ? HARNESS_REQUIRED : HARNESS_HINT}</p>
                </fieldset>
            </div>

            {failure === undefined ? null : (
                <p role="alert" className={FORM_FAILURE}>
                    {failure}
                </p>
            )}

            <div className={FORM_ROW}>
                <Button type="button" variant="outline" onClick={cancel} disabled={starting}>
                    {CANCEL_LABEL}
                </Button>
                <Button
                    type="submit"
                    disabled={starting || goal.trim().length === 0 || rosterIsEmpty}
                >
                    {starting ? <Spinner aria-hidden="true" /> : null}
                    {starting ? STARTING_INVESTIGATION_LABEL : START_INVESTIGATION_LABEL}
                </Button>
            </div>
        </form>
    );
}
