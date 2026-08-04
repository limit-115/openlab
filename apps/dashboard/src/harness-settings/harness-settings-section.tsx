import { LabSettingsSchema } from "@lab/protocol/lab-settings/lab-settings.schema";
import type { LabSettings } from "@lab/protocol/lab-settings/lab-settings.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import { HarnessRosterField } from "#src/harness-settings/harness-roster-field";
import {
    HARNESS_SETTINGS_DESCRIPTION,
    HARNESS_SETTINGS_TITLE,
    NO_SETTINGS_DESCRIPTION,
    NO_SETTINGS_TITLE,
    SAVE_FAILURE_LABEL,
    SAVE_LABEL,
    SAVED_LABEL,
    SAVING_LABEL,
    SETTINGS_ACTIONS,
    SETTINGS_FAILURE,
    SETTINGS_FORM,
    SETTINGS_PENDING,
    SETTINGS_PENDING_LABEL,
    SETTINGS_SAVED
} from "#src/harness-settings/harness-settings.const";
import type { LabSettingsDraft } from "#src/harness-settings/harness-settings.types";
import {
    fetchLabSettings,
    labSettingsQueryKey,
    saveLabSettings
} from "#src/harness-settings/harness-settings-client";
import {
    chooseHarness,
    chooseRoleEffort,
    chooseRoleModel
} from "#src/harness-settings/harness-settings-draft";
import { RoleExecutionTable } from "#src/harness-settings/role-execution-table";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/**
 * What the lab dispatches with. The page edits a draft and hands the whole document over at once,
 * then takes the lab's answer back as the draft: what is on screen after a save is what agents are
 * actually being run with, never what was typed.
 */
export function HarnessSettingsSection() {
    const queryClient = useQueryClient();
    const settings = useQuery({
        queryKey: labSettingsQueryKey,
        queryFn: ({ signal }) => fetchLabSettings(signal),
        retry: false
    });
    const [draft, setDraft] = useState<LabSettingsDraft | undefined>(undefined);
    const [seeded, setSeeded] = useState<LabSettings | undefined>(undefined);

    if (settings.data !== undefined && settings.data !== seeded) {
        setSeeded(settings.data);
        setDraft(settings.data);
    }

    const save = useMutation({
        mutationFn: (edited: LabSettingsDraft) => saveLabSettings(LabSettingsSchema.parse(edited)),
        onSuccess: (saved) => queryClient.setQueryData(labSettingsQueryKey, saved)
    });

    if (draft === undefined) {
        return (
            <Panel title={HARNESS_SETTINGS_TITLE} description={HARNESS_SETTINGS_DESCRIPTION}>
                {settings.isPending ? (
                    <p className={SETTINGS_PENDING}>
                        <Spinner />
                        {SETTINGS_PENDING_LABEL}
                    </p>
                ) : (
                    <PanelEmptyState
                        title={NO_SETTINGS_TITLE}
                        description={NO_SETTINGS_DESCRIPTION}
                    />
                )}
            </Panel>
        );
    }

    /**
     * An edit puts the page ahead of the lab again, so the answer to the last save stops speaking
     * for what is on screen: neither the refusal nor the confirmation outlives the settings it was
     * given for.
     */
    function edit(edited: LabSettingsDraft) {
        setDraft(edited);
        save.reset();
    }

    return (
        <Panel title={HARNESS_SETTINGS_TITLE} description={HARNESS_SETTINGS_DESCRIPTION}>
            <form
                className={SETTINGS_FORM}
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate(draft);
                }}
            >
                <HarnessRosterField
                    roster={draft.harness_roster}
                    choose={(harness, chosen) => edit(chooseHarness(draft, harness, chosen))}
                />

                <RoleExecutionTable
                    settings={draft}
                    chooseEffort={(role, effort) => edit(chooseRoleEffort(draft, role, effort))}
                    chooseModel={(role, harness, model) =>
                        edit(chooseRoleModel(draft, role, harness, model))
                    }
                />

                <div className={SETTINGS_ACTIONS}>
                    {save.isError ? (
                        <p role="alert" className={SETTINGS_FAILURE}>
                            {SAVE_FAILURE_LABEL}
                        </p>
                    ) : null}
                    {save.isSuccess ? (
                        <p className={SETTINGS_SAVED}>
                            <CheckIcon aria-hidden="true" />
                            {SAVED_LABEL}
                        </p>
                    ) : null}
                    <Button
                        type="submit"
                        disabled={save.isPending || draft.harness_roster.length === 0}
                    >
                        {save.isPending ? <Spinner aria-hidden="true" /> : null}
                        {save.isPending ? SAVING_LABEL : SAVE_LABEL}
                    </Button>
                </div>
            </form>
        </Panel>
    );
}
