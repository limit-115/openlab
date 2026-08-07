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
 * holding one. Forgetting it is offered in the same breath, because that is the only control that
 * stops the lab spending the wallet.
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
                />
                <Button
                    type="button"
                    disabled={typed.trim().length === 0 || busy}
                    onClick={() => save.mutate()}
                >
                    {save.isPending ? t("deepseekKeySaving") : t("deepseekKeySave")}
                </Button>
                {held.data?.key_set === true ? (
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
        </>
    );
}
