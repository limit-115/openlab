import { isCapped } from "@openlab/protocol/spend-caps/spend-cap";
import { NO_SPEND_CAP_PERCENT } from "@openlab/protocol/spend-caps/spend-cap.const";
import type { AllowanceWindow } from "@openlab/protocol/subscription-allowance/subscription-allowance.types";
import { Slider as SliderPrimitive } from "radix-ui";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import {
    CAP_METER_ROW,
    CAP_SLIDER,
    CAP_SLIDER_THUMB,
    CAP_SLIDER_TRACK,
    SPEND_CAP_MIN_PERCENT,
    SPEND_CAP_STEP_PERCENT
} from "#src/subscription-allowance/spend-cap-meter.const";
import { SUBSCRIPTION_ALLOWANCE_NAMESPACE } from "#src/subscription-allowance/subscription-allowance.i18n";
import {
    ALLOWANCE_METER,
    ALLOWANCE_METER_SPENT,
    ALLOWANCE_WINDOW_HEADER,
    ALLOWANCE_WINDOW_RESET,
    SPENT_PERCENT
} from "#src/subscription-allowance/subscription-allowance-list.const";
import { formatDate } from "#src/value-display/timestamp-display";

interface SpendCapMeterProps {
    window: AllowanceWindow;
    /** How long the window runs, in the words this page names windows by. */
    label: string;
    /** Where the limiter stands, which is where the operator has dragged it rather than where the lab is holding. */
    cap: number;
    /** The lab is passing this subscription over on this window, by the caps it has actually been given. */
    withheld: boolean;
    /** Absent where the runtime serves no settings: the meter is then a reading and nothing more. */
    setCap?: (percent: number) => void;
}

/**
 * One rolling window: how much of it is spent, and the point the lab stops spending it. The limiter
 * rides on the meter rather than sitting beside it, because the number it carries only means
 * anything against the reading it is drawn over — an operator sets a cap by looking at where the
 * consumption already reaches.
 */
export function SpendCapMeter({ window, label, cap, withheld, setCap }: SpendCapMeterProps) {
    const { t } = useTranslation(SUBSCRIPTION_ALLOWANCE_NAMESPACE);
    const spent = window.used_percent >= SPENT_PERCENT;

    return (
        <>
            <div className={ALLOWANCE_WINDOW_HEADER}>
                <span>
                    {t("used", { window: label, percent: Math.round(window.used_percent) })}
                </span>
                <span className={ALLOWANCE_WINDOW_RESET}>
                    <span>{isCapped(cap) ? t("capStops", { percent: cap }) : t("capNone")}</span>
                    {window.resets_at === null ? null : (
                        <span>{` · ${t("resets", { at: formatDate(window.resets_at) })}`}</span>
                    )}
                </span>
            </div>
            <div className={CAP_METER_ROW}>
                <progress
                    className={cn(ALLOWANCE_METER, (spent || withheld) && ALLOWANCE_METER_SPENT)}
                    value={Math.min(window.used_percent, SPENT_PERCENT)}
                    max={SPENT_PERCENT}
                    aria-label={t("meter", { window: label })}
                />
                {setCap === undefined ? null : (
                    <SliderPrimitive.Root
                        className={CAP_SLIDER}
                        value={[cap]}
                        min={SPEND_CAP_MIN_PERCENT}
                        max={NO_SPEND_CAP_PERCENT}
                        step={SPEND_CAP_STEP_PERCENT}
                        onValueChange={([percent]) => {
                            if (percent !== undefined) {
                                setCap(percent);
                            }
                        }}
                    >
                        <SliderPrimitive.Track className={CAP_SLIDER_TRACK} />
                        <SliderPrimitive.Thumb
                            className={CAP_SLIDER_THUMB}
                            aria-label={t("capMeter", { window: label })}
                            aria-valuetext={
                                isCapped(cap) ? t("capStops", { percent: cap }) : t("capNone")
                            }
                        />
                    </SliderPrimitive.Root>
                )}
            </div>
        </>
    );
}
