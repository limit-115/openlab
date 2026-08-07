import type { AllowanceBalance } from "@openlab/protocol/subscription-allowance/subscription-allowance.types";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "#src/design-system/input";
import { SUBSCRIPTION_ALLOWANCE_NAMESPACE } from "#src/subscription-allowance/subscription-allowance.i18n";
import {
    ALLOWANCE_WINDOW_HEADER,
    ALLOWANCE_WINDOW_RESET
} from "#src/subscription-allowance/subscription-allowance-list.const";
import {
    WALLET_FLOOR_CURRENCY,
    WALLET_FLOOR_INPUT,
    WALLET_FLOOR_PATTERN,
    WALLET_FLOOR_ROW
} from "#src/subscription-allowance/wallet-floor-field.const";

interface WalletFloorFieldProps {
    balance: AllowanceBalance;
    /** Where the floor stands on the page, which is where the operator typed it rather than where the lab is holding. */
    floor: string | undefined;
    /** The lab is passing this wallet over on this currency, by the floors it has actually been given. */
    withheld: boolean;
    /** Absent where the runtime serves no settings: the money is then a reading and nothing more. */
    setFloor?: (floor: string) => void;
}

/**
 * One currency of a wallet: the money in it, and the money the lab must leave behind. There is no
 * meter drawn over it and no limiter to drag, because a wallet has no full to be a share of — it
 * holds what the operator last paid in, and the only number that means anything is the one they
 * type.
 */
export function WalletFloorField({ balance, floor, withheld, setFloor }: WalletFloorFieldProps) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);
    const fieldId = useId();

    return (
        <>
            <div className={ALLOWANCE_WINDOW_HEADER}>
                <span>
                    {t("walletLeft", { amount: balance.amount, currency: balance.currency })}
                </span>
                <span className={ALLOWANCE_WINDOW_RESET}>
                    {floor === undefined
                        ? t("floorNone")
                        : t("floorStops", { amount: floor, currency: balance.currency })}
                </span>
            </div>
            {setFloor === undefined ? null : (
                <div className={WALLET_FLOOR_ROW}>
                    <label htmlFor={fieldId}>{t("floorKeep")}</label>
                    <Input
                        id={fieldId}
                        className={WALLET_FLOOR_INPUT}
                        type="text"
                        inputMode="decimal"
                        value={floor ?? ""}
                        aria-invalid={withheld}
                        /**
                         * A keystroke that would leave something the lab cannot compare against a
                         * balance is refused here rather than on save: the operator would get a
                         * rejection naming a schema, and the field they typed into knows better.
                         */
                        onChange={(event) => {
                            if (WALLET_FLOOR_PATTERN.test(event.target.value)) {
                                setFloor(event.target.value);
                            }
                        }}
                    />
                    <span className={WALLET_FLOOR_CURRENCY}>{balance.currency}</span>
                </div>
            )}
        </>
    );
}
