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
import type {
    LabSettingsDraft,
    LabSettingsEdit
} from "#src/harness-settings/harness-settings.types";
import {
    fetchLabSettings,
    labSettingsQueryKey,
    saveLabSettings
} from "#src/harness-settings/harness-settings-client";
import {
    chooseHarness,
    chooseRoleEffort,
    chooseRoleModel,
    hasUnsavedEdits
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
    const [edited, setEdited] = useState<LabSettingsEdit | undefined>(undefined);

    if (settings.data !== undefined && settings.data !== edited?.saved) {
        setEdited({ saved: settings.data, draft: settings.data });
    }

    const save = useMutation({
        mutationFn: (draft: LabSettingsDraft) => saveLabSettings(LabSettingsSchema.parse(draft)),
        /**
         * The lab's answer becomes the page in one step rather than through the read noticing it.
         * A document identical to the one already held is handed back as the very object the cache
         * keeps, so waiting for it to look new would leave what was typed on screen for good.
         */
        onSuccess: (stored) => {
            const held = queryClient.setQueryData<LabSettings>(labSettingsQueryKey, stored);
            setEdited({ saved: held ?? stored, draft: held ?? stored });
        }
    });

    if (edited === undefined) {
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

    const { draft, saved } = edited;
    /** Only settings the lab has not been given are worth a control, so nothing else grows one. */
    const unsaved = hasUnsavedEdits(draft, saved);

    /**
     * An edit puts the page ahead of the lab again, so the answer to the last save stops speaking
     * for what is on screen: neither the refusal nor the confirmation outlives the settings it was
     * given for.
     */
    function change(next: LabSettingsDraft) {
        setEdited({ saved, draft: next });
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
                    choose={(harness, chosen) => change(chooseHarness(draft, harness, chosen))}
                />

                <RoleExecutionTable
                    settings={draft}
                    chooseEffort={(role, effort) => change(chooseRoleEffort(draft, role, effort))}
                    chooseModel={(role, harness, model) =>
                        change(chooseRoleModel(draft, role, harness, model))
                    }
                />

                {unsaved ? (
                    <div className={SETTINGS_ACTIONS}>
                        {save.isError ? (
                            <p role="alert" className={SETTINGS_FAILURE}>
                                {SAVE_FAILURE_LABEL}
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
                ) : null}

                {save.isSuccess ? (
                    <p className={SETTINGS_SAVED}>
                        <CheckIcon aria-hidden="true" />
                        {SAVED_LABEL}
                    </p>
                ) : null}
            </form>
        </Panel>
    );
}
