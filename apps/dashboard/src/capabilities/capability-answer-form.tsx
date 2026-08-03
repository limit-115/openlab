import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import {
    ANSWER_CAPABILITY_LABEL,
    ANSWER_FORM,
    ANSWER_FORM_FAILURE,
    ANSWER_FORM_FIELD,
    ANSWER_FORM_LABEL,
    ANSWER_FORM_ROW,
    ANSWER_LABEL,
    ANSWER_PLACEHOLDER,
    ANSWERING_CAPABILITY_LABEL
} from "#src/capabilities/capability-answer.const";
import { answerCapability } from "#src/capabilities/capability-answer-request";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import { Textarea } from "#src/design-system/textarea";
import { statusQueryKey } from "#src/live-status/status-client";

interface CapabilityAnswerFormProps {
    requestId: string;
}

/**
 * Answers an open capability request. Nothing here inspects the prose: an operator who wants to say
 * no, or to say go build it yourself, is answering just as completely as one handing over a secret.
 */
export function CapabilityAnswerForm({ requestId }: CapabilityAnswerFormProps) {
    const queryClient = useQueryClient();
    const fieldId = useId();
    const [answer, setAnswer] = useState("");
    const submission = useMutation({
        mutationFn: answerCapability,
        onSuccess: () => {
            setAnswer("");
            void queryClient.invalidateQueries({ queryKey: statusQueryKey });
        }
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submission.mutate({ id: requestId, answer: answer.trim() });
    }

    const failure = submission.error?.message;

    return (
        <form className={ANSWER_FORM} onSubmit={submit} noValidate>
            <div className={ANSWER_FORM_FIELD}>
                <label className={ANSWER_FORM_LABEL} htmlFor={fieldId}>
                    {ANSWER_LABEL}
                </label>
                <Textarea
                    id={fieldId}
                    value={answer}
                    placeholder={ANSWER_PLACEHOLDER}
                    aria-invalid={failure !== undefined}
                    onChange={(event) => setAnswer(event.target.value)}
                />
            </div>
            <div className={ANSWER_FORM_ROW}>
                <Button
                    type="submit"
                    size="sm"
                    disabled={submission.isPending || answer.trim().length === 0}
                >
                    {submission.isPending ? <Spinner aria-hidden="true" /> : null}
                    {submission.isPending ? ANSWERING_CAPABILITY_LABEL : ANSWER_CAPABILITY_LABEL}
                </Button>
            </div>
            {failure === undefined ? null : (
                <p role="alert" className={ANSWER_FORM_FAILURE}>
                    {failure}
                </p>
            )}
        </form>
    );
}
