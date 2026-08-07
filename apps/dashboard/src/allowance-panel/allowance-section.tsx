import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import type { HarnessAllowanceRoster } from "@openlab/protocol/harness-allowance/harness-allowance.types";
import type { LabSettings } from "@openlab/protocol/lab-settings/lab-settings.types";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    fetchHarnessAllowance,
    harnessAllowanceQueryKey,
    refreshHarnessAllowance
} from "#src/allowance-panel/allowance-client";
import { HarnessAllowanceList } from "#src/allowance-panel/allowance-list";
import { HARNESS_ALLOWANCE_NAMESPACE } from "#src/allowance-panel/allowance-panel.i18n";
import { AllowanceReadingHeader } from "#src/allowance-panel/allowance-reading-header";
import { allowanceReadingTime } from "#src/allowance-panel/allowance-reading-time";
import {
    ALLOWANCE_READING_PENDING,
    ALLOWANCE_REFETCH_MILLISECONDS,
    CAPS_ACTIONS,
    CAPS_FAILURE,
    CAPS_SAVED
} from "#src/allowance-panel/allowance-section.const";
import {
    hasCapEdits,
    settledCaps,
    withWalletFloor,
    withWindowCap
} from "#src/allowance-panel/spend-cap-draft";
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import {
    fetchLabSettings,
    labSettingsQueryKey,
    saveLabSettings
} from "#src/lab-configuration/lab-settings-client";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/** What the lab last stored, beside the caps the operator has since dragged the limiters to. */
interface SpendCapEdit {
    readonly saved: LabSettings;
    readonly draft: SpendCaps;
}

/**
 * What every subscription the lab can run on has left, and how far into each one the lab may spend.
 * The two belong on one block because neither is worth much alone: a cap is a mark on a reading,
 * and a reading with no cap on it does not say what the lab will actually do with the allowance.
 */
export function HarnessAllowanceSection() {
    const { t } = useTranslation(HARNESS_ALLOWANCE_NAMESPACE);
    const queryClient = useQueryClient();
    const allowances = useQuery({
        queryKey: harnessAllowanceQueryKey,
        queryFn: ({ signal }) => fetchHarnessAllowance(signal),
        retry: false,
        staleTime: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchInterval: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchOnWindowFocus: true
    });

    /**
     * A refresh goes past whatever the daemon is holding and onto the vendors, so the reading the
     * operator gets back is the one they asked for. Its answer is handed to the polling query, and
     * the interval carries on from there.
     */
    const refresh = useMutation({
        mutationFn: () => refreshHarnessAllowance(),
        onSuccess: (roster) => queryClient.setQueryData(harnessAllowanceQueryKey, roster)
    });

    const settings = useQuery({
        queryKey: labSettingsQueryKey,
        queryFn: ({ signal }) => fetchLabSettings(signal),
        retry: false
    });
    const [edited, setEdited] = useState<SpendCapEdit | undefined>(undefined);

    if (settings.data !== undefined && settings.data !== edited?.saved) {
        setEdited({ saved: settings.data, draft: settings.data.spend_caps });
    }

    /**
     * The caps are one field of the lab's settings, so they are handed back inside the document the
     * page was given. What comes back becomes the page: after a save the limiters stand where the
     * lab is holding, never where they were dragged to.
     */
    const save = useMutation({
        mutationFn: (document: LabSettings) => saveLabSettings(document),
        onSuccess: (stored) => {
            const held =
                queryClient.setQueryData<LabSettings>(labSettingsQueryKey, stored) ?? stored;
            setEdited({ saved: held, draft: held.spend_caps });
        }
    });

    /**
     * Moving a limiter puts the page ahead of the lab again, so the answer to the last save stops
     * speaking for what is on screen.
     */
    function moveCap(harness: AgentHarnessKind, windowMinutes: number, percent: number): void {
        if (edited === undefined) {
            return;
        }
        setEdited({
            saved: edited.saved,
            draft: withWindowCap(edited.draft, harness, windowMinutes, percent)
        });
        save.reset();
    }

    function moveFloor(harness: AgentHarnessKind, currency: string, floor: string): void {
        if (edited === undefined) {
            return;
        }
        setEdited({
            saved: edited.saved,
            draft: withWalletFloor(edited.draft, harness, currency, floor)
        });
        save.reset();
    }

    const unsaved = edited !== undefined && hasCapEdits(edited.draft, edited.saved.spend_caps);

    return (
        <Panel title={t("title")} description={t("description")}>
            <AllowanceReadings
                allowances={allowances.data}
                pending={allowances.isPending}
                refresh={() => refresh.mutate()}
                reading={refresh.isPending || allowances.isFetching}
                failed={refresh.isError}
                caps={edited?.draft ?? []}
                heldBy={edited?.saved.spend_caps ?? []}
                {...(edited === undefined ? {} : { setCap: moveCap, setFloor: moveFloor })}
            />

            {unsaved ? (
                <div className={CAPS_ACTIONS}>
                    {save.isError ? (
                        <p role="alert" className={CAPS_FAILURE}>
                            {t("capSaveFailure")}
                        </p>
                    ) : null}
                    <Button
                        type="button"
                        disabled={save.isPending}
                        onClick={() =>
                            save.mutate({
                                ...edited.saved,
                                spend_caps: settledCaps(edited.draft)
                            })
                        }
                    >
                        {save.isPending ? <Spinner aria-hidden="true" /> : null}
                        {save.isPending ? t("capSaving") : t("capSave")}
                    </Button>
                </div>
            ) : null}

            {save.isSuccess ? (
                <p className={CAPS_SAVED}>
                    <CheckIcon aria-hidden="true" />
                    {t("capSaved")}
                </p>
            ) : null}
        </Panel>
    );
}

interface AllowanceReadingsProps {
    allowances: HarnessAllowanceRoster | undefined;
    /** The first reading is still on its way, so there is nothing to show yet rather than nothing. */
    pending: boolean;
    refresh: () => void;
    reading: boolean;
    failed: boolean;
    caps: SpendCaps;
    heldBy: SpendCaps;
    setCap?: (harness: AgentHarnessKind, windowMinutes: number, percent: number) => void;
    setFloor?: (harness: AgentHarnessKind, currency: string, floor: string) => void;
}

/**
 * An operator who came here for the numbers is owed the reason there are none, so a runtime that
 * does not serve the readings says so outright instead of leaving the block empty.
 */
function AllowanceReadings({
    allowances,
    pending,
    refresh,
    reading,
    failed,
    caps,
    heldBy,
    setCap,
    setFloor
}: AllowanceReadingsProps) {
    const { t } = useTranslation(HARNESS_ALLOWANCE_NAMESPACE);

    if (allowances === undefined) {
        return pending ? (
            <p className={ALLOWANCE_READING_PENDING}>
                <Spinner />
                {t("pending")}
            </p>
        ) : (
            <PanelEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        );
    }

    return (
        <>
            <AllowanceReadingHeader
                readAt={allowanceReadingTime(allowances)}
                refresh={refresh}
                reading={reading}
                failed={failed}
            />
            <HarnessAllowanceList
                allowances={allowances}
                caps={caps}
                heldBy={heldBy}
                {...(setCap === undefined ? {} : { setCap })}
                {...(setFloor === undefined ? {} : { setFloor })}
            />
        </>
    );
}
