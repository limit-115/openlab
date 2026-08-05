import type { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import type { InvestigationDispatch } from "@lab/protocol/investigation-input/investigation-dispatch.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import { Button } from "#src/design-system/button";
import { Checkbox } from "#src/design-system/checkbox";
import { cn } from "#src/design-system/class-names";
import { Spinner } from "#src/design-system/spinner";
import { Switch } from "#src/design-system/switch";
import {
    DISPATCH_ACTIONS,
    DISPATCH_FAILURE,
    DISPATCH_FIELD,
    DISPATCH_FIELD_HINT,
    DISPATCH_FIELD_LABEL,
    DISPATCH_FORM,
    DISPATCH_HARNESS,
    DISPATCH_HARNESS_CHOSEN,
    DISPATCH_HARNESSES,
    DISPATCH_PENDING,
    DISPATCH_SAVED,
    DISPATCH_SWITCH_ROW,
    DISPATCHABLE_HARNESSES
} from "#src/investigation-dispatch/dispatch-panel.const";
import { INVESTIGATION_DISPATCH_NAMESPACE } from "#src/investigation-dispatch/investigation-dispatch.i18n";
import {
    fetchInvestigationDispatch,
    investigationDispatchQueryKey,
    saveInvestigationDispatch
} from "#src/investigation-dispatch/investigation-dispatch-client";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/** What the lab last answered with, beside what the operator has made of it. */
interface DispatchEdit {
    readonly saved: InvestigationDispatch;
    readonly draft: InvestigationDispatch;
}

/**
 * The two moves an operator has over one investigation's spending: point it at other subscriptions,
 * or take the lab's caps off it. They belong together because they are the same decision seen from
 * either side — this run matters more than the allowance, or it can wait on a harness that has some.
 */
export function DispatchPanel({ investigationId }: { investigationId: string }) {
    const { t } = useTranslation(INVESTIGATION_DISPATCH_NAMESPACE);
    const queryClient = useQueryClient();
    const queryKey = investigationDispatchQueryKey(investigationId);
    const dispatch = useQuery({
        queryKey,
        queryFn: ({ signal }) => fetchInvestigationDispatch(investigationId, signal),
        retry: false
    });
    const [edited, setEdited] = useState<DispatchEdit | undefined>(undefined);

    if (dispatch.data !== undefined && dispatch.data !== edited?.saved) {
        setEdited({ saved: dispatch.data, draft: dispatch.data });
    }

    const save = useMutation({
        mutationFn: (draft: InvestigationDispatch) =>
            saveInvestigationDispatch(investigationId, draft),
        onSuccess: (stored) => {
            const held =
                queryClient.setQueryData<InvestigationDispatch>(queryKey, stored) ?? stored;
            setEdited({ saved: held, draft: held });
        }
    });

    if (edited === undefined) {
        return (
            <Panel title={t("title")} description={t("description")}>
                {dispatch.isPending ? (
                    <p className={DISPATCH_PENDING}>
                        <Spinner />
                        {t("pending")}
                    </p>
                ) : (
                    <PanelEmptyState
                        title={t("unsupportedTitle")}
                        description={t("unsupportedDescription")}
                    />
                )}
            </Panel>
        );
    }

    const { draft, saved } = edited;
    const unsaved =
        draft.spend_past_caps !== saved.spend_past_caps ||
        draft.harness_kinds.length !== saved.harness_kinds.length ||
        draft.harness_kinds.some((harness, position) => harness !== saved.harness_kinds[position]);

    /**
     * An edit puts the page ahead of the lab again, so the answer to the last save stops speaking
     * for what is on screen.
     */
    function change(next: InvestigationDispatch): void {
        setEdited({ saved, draft: next });
        save.reset();
    }

    return (
        <Panel title={t("title")} description={t("description")}>
            <form
                className={DISPATCH_FORM}
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate(draft);
                }}
            >
                <DispatchHarnesses
                    roster={draft.harness_kinds}
                    choose={(harness, chosen) =>
                        change({ ...draft, harness_kinds: chooseHarness(draft, harness, chosen) })
                    }
                />

                <SpendPastCaps
                    spendPastCaps={draft.spend_past_caps}
                    choose={(spendPastCaps) => change({ ...draft, spend_past_caps: spendPastCaps })}
                />

                {unsaved ? (
                    <div className={DISPATCH_ACTIONS}>
                        {save.isError ? (
                            <p role="alert" className={DISPATCH_FAILURE}>
                                {t("saveFailure")}
                            </p>
                        ) : null}
                        <Button
                            type="submit"
                            disabled={save.isPending || draft.harness_kinds.length === 0}
                        >
                            {save.isPending ? <Spinner aria-hidden="true" /> : null}
                            {save.isPending ? t("saving") : t("save")}
                        </Button>
                    </div>
                ) : null}

                {save.isSuccess ? (
                    <p className={DISPATCH_SAVED}>
                        <CheckIcon aria-hidden="true" />
                        {t("saved")}
                    </p>
                ) : null}
            </form>
        </Panel>
    );
}

/**
 * The roster keeps the listed order however the boxes are ticked, because that order is the
 * rotation the investigation walks from the next cycle on.
 */
function chooseHarness(
    dispatch: InvestigationDispatch,
    harness: AgentHarnessKind,
    chosen: boolean
): AgentHarnessKind[] {
    return DISPATCHABLE_HARNESSES.filter((candidate) =>
        candidate === harness ? chosen : dispatch.harness_kinds.includes(candidate)
    );
}

function DispatchHarnesses({
    roster,
    choose
}: {
    roster: readonly AgentHarnessKind[];
    choose: (harness: AgentHarnessKind, chosen: boolean) => void;
}) {
    const { t } = useTranslation(INVESTIGATION_DISPATCH_NAMESPACE);
    const fieldId = useId();

    return (
        <div className={DISPATCH_FIELD}>
            <p className={DISPATCH_FIELD_LABEL}>{t("harnesses")}</p>
            <p className={DISPATCH_FIELD_HINT}>{t("harnessesHint")}</p>
            <ul className={DISPATCH_HARNESSES}>
                {DISPATCHABLE_HARNESSES.map((harness) => (
                    <li key={harness}>
                        <label
                            htmlFor={`${fieldId}-${harness}`}
                            className={cn(
                                DISPATCH_HARNESS,
                                roster.includes(harness) && DISPATCH_HARNESS_CHOSEN
                            )}
                        >
                            <Checkbox
                                id={`${fieldId}-${harness}`}
                                checked={roster.includes(harness)}
                                onCheckedChange={(chosen) => choose(harness, chosen === true)}
                            />
                            {HARNESS_NAME[harness]}
                        </label>
                    </li>
                ))}
            </ul>
            {roster.length === 0 ? (
                <p role="alert" className={DISPATCH_FAILURE}>
                    {t("harnessesRequired")}
                </p>
            ) : null}
        </div>
    );
}

function SpendPastCaps({
    spendPastCaps,
    choose
}: {
    spendPastCaps: boolean;
    choose: (spendPastCaps: boolean) => void;
}) {
    const { t } = useTranslation(INVESTIGATION_DISPATCH_NAMESPACE);
    const switchId = useId();

    return (
        <div className={DISPATCH_FIELD}>
            <div className={DISPATCH_SWITCH_ROW}>
                <label htmlFor={switchId} className={DISPATCH_FIELD_LABEL}>
                    {t("pastCaps")}
                </label>
                <Switch id={switchId} checked={spendPastCaps} onCheckedChange={choose} />
            </div>
            <p className={DISPATCH_FIELD_HINT}>{t("pastCapsHint")}</p>
        </div>
    );
}
