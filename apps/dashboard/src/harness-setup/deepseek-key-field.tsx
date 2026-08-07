import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#src/design-system/button";
import { Input } from "#src/design-system/input";
import {
    deepseekKeyQueryKey,
    fetchDeepseekKeyState,
    forgetDeepseekKey,
    saveDeepseekKey
} from "#src/harness-setup/deepseek-key-client";
import { harnessReadinessQueryKey } from "#src/harness-setup/harness-readiness-client";
import {
    HARNESS_CARD_ERROR,
    HARNESS_KEY_FORM,
    HARNESS_KEY_HELD,
    HARNESS_KEY_INPUT
} from "#src/harness-setup/harness-setup.const";
import { HARNESS_SETUP_NAMESPACE } from "#src/harness-setup/harness-setup.i18n";

/**
 * Where the operator gives the lab its DeepSeek key. Every other harness is signed in with a command
 * in a terminal, because every other harness has its own login; DeepSeek has only a key, so this is
 * the one card that asks for a secret.
 *
 * A key that was accepted is never shown again — the field empties and the card says the lab is
 * holding one. Forgetting it is offered in the same breath, because it is what keeps the lab from
 * spending the wallet again. It does not reach an agent that is already running: that one was handed
 * the key when it started, and stopping the investigation is what stops it.
 */
export function DeepseekKeyField() {
    const { t } = useTranslation(HARNESS_SETUP_NAMESPACE);
    const queryClient = useQueryClient();
    const [typed, setTyped] = useState("");
    const held = useQuery({
        queryKey: deepseekKeyQueryKey,
        queryFn: ({ signal }) => fetchDeepseekKeyState(signal),
        retry: false
    });

    /** A key that changed changes what the CLIs would answer, so the cards are asked again. */
    const settled = async (keySet: boolean): Promise<void> => {
        queryClient.setQueryData(deepseekKeyQueryKey, { key_set: keySet });
        setTyped("");
        await queryClient.invalidateQueries({ queryKey: harnessReadinessQueryKey });
    };

    const save = useMutation({
        mutationFn: () => saveDeepseekKey(typed),
        onSuccess: (state) => settled(state.key_set)
    });
    const forget = useMutation({
        mutationFn: forgetDeepseekKey,
        onSuccess: (state) => settled(state.key_set)
    });
    const busy = save.isPending || forget.isPending;

    return (
        <>
            <div className={HARNESS_KEY_FORM}>
                <Input
                    type="password"
                    autoComplete="off"
                    className={HARNESS_KEY_INPUT}
                    aria-label={t("deepseekKeyLabel")}
                    placeholder={t("deepseekKeyPlaceholder")}
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    /** The field is emptied once the lab answers, which would swallow a key typed while it was still answering. */
                    disabled={busy}
                />
                <Button
                    type="button"
                    disabled={typed.trim().length === 0 || busy}
                    onClick={() => save.mutate()}
                >
                    {save.isPending ? t("deepseekKeySaving") : t("deepseekKeySave")}
                </Button>
                {/**
                 * Offered when the lab holds a key and also when it could not be asked. Forgetting a
                 * key that is not there costs nothing; not offering it while one might be spending
                 * costs money.
                 */}
                {held.data?.key_set === true || held.isError ? (
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => forget.mutate()}
                    >
                        {t("deepseekKeyForget")}
                    </Button>
                ) : null}
            </div>
            {held.data?.key_set === true ? (
                <p className={HARNESS_KEY_HELD}>{t("deepseekKeyHeld")}</p>
            ) : null}
            {save.isError || forget.isError ? (
                <p className={HARNESS_CARD_ERROR}>{t("deepseekKeyRefused")}</p>
            ) : null}
            {/**
             * A read that failed is not the same as a lab holding no key, and drawing it as one would
             * take away the control that stops the spending while the spending carries on. The card
             * says it does not know instead.
             */}
            {held.isError ? <p className={HARNESS_CARD_ERROR}>{t("deepseekKeyUnknown")}</p> : null}
        </>
    );
}
