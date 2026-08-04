import { RefreshCwIcon } from "lucide-react";
import { Button } from "#src/design-system/button";
import { cn } from "#src/design-system/class-names";
import {
    AUTO_REFRESH_LABEL,
    READ_AT_LABEL,
    READING_ACTIONS,
    READING_AUTO_REFRESH,
    READING_HEADER,
    READING_REFRESH_FAILURE,
    READING_REFRESH_TURNING,
    READING_STATE,
    READING_TIME,
    REFRESH_FAILURE_LABEL,
    REFRESH_LABEL
} from "#src/subscription-allowance/allowance-reading-header.const";
import { formatDate } from "#src/value-display/timestamp-display";

interface AllowanceReadingHeaderProps {
    /** When the numbers below were read off the vendors. */
    readAt: string | undefined;
    refresh: () => void;
    /**
     * A reading is on its way, whether the operator asked for it or the interval did. Asking again
     * on top of one would only queue a second trip to the same vendors.
     */
    reading: boolean;
    /** Shown when the daemon refused the refresh, so the standing numbers are not taken as new. */
    failed: boolean;
}

/**
 * How old the allowance on this page is, and the way to ask for it again. An operator deciding
 * whether to dispatch is acting on a reading rather than on a live number, so the page says which
 * moment it is speaking for and how often that moment moves without them.
 */
export function AllowanceReadingHeader({
    readAt,
    refresh,
    reading,
    failed
}: AllowanceReadingHeaderProps) {
    return (
        <div className={READING_HEADER}>
            <div className={READING_STATE}>
                <p className={READING_TIME}>
                    {READ_AT_LABEL} {formatDate(readAt)}
                </p>
                <p className={READING_AUTO_REFRESH}>· {AUTO_REFRESH_LABEL}</p>
            </div>
            <div className={READING_ACTIONS}>
                {failed ? (
                    <p role="alert" className={READING_REFRESH_FAILURE}>
                        {REFRESH_FAILURE_LABEL}
                    </p>
                ) : null}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={reading}
                >
                    <RefreshCwIcon className={cn(reading && READING_REFRESH_TURNING)} />
                    {REFRESH_LABEL}
                </Button>
            </div>
        </div>
    );
}
