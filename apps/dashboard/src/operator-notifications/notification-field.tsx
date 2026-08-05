import { type ReactNode, useId } from "react";
import {
    FIELD,
    FIELD_HEADING,
    FIELD_HINT,
    FIELD_LABEL
} from "#src/operator-notifications/operator-notifications.const";

interface NotificationFieldProps {
    label: string;
    hint?: string;
    /** What the field is set by, where that is a choice in its own right rather than a value. */
    aside?: ReactNode;
    children: ReactNode;
}

/**
 * One labelled setting on the notifications page. The label shares its line with whatever decides
 * where the setting comes from, so a channel following the lab reads as one statement rather than
 * as a switch floating above a control it happens to govern.
 */
export function NotificationField({ label, hint, aside, children }: NotificationFieldProps) {
    const labelId = useId();

    /**
     * The label is named rather than captioned, because a legend has to be the fieldset's first
     * child and this one shares its line with the control deciding where the setting comes from.
     */
    return (
        <fieldset aria-labelledby={labelId} className={FIELD}>
            <div className={FIELD_HEADING}>
                <span id={labelId} className={FIELD_LABEL}>
                    {label}
                </span>
                {aside}
            </div>
            {children}
            {hint === undefined ? null : <p className={FIELD_HINT}>{hint}</p>}
        </fieldset>
    );
}
