import { RadioIcon, WifiOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "#src/design-system/badge";
import { CONNECTION_BADGE_TONE, SIGNAL_PULSE } from "#src/live-status/connection-badge.const";
import { LIVE_STATUS_NAMESPACE } from "#src/live-status/live-status.i18n";
import { StreamState } from "#src/live-status/status-stream.const";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface ConnectionBadgeProps {
    stream: LiveStatus;
}

export function ConnectionBadge({ stream }: ConnectionBadgeProps) {
    const { t } = useTranslation(LIVE_STATUS_NAMESPACE);

    return (
        <Badge
            variant={CONNECTION_BADGE_TONE[stream.state]}
            title={stream.protocolError}
            aria-live="polite"
        >
            {stream.state === StreamState.UNAVAILABLE ? (
                <WifiOffIcon aria-hidden="true" />
            ) : (
                <RadioIcon
                    className={stream.state === StreamState.LIVE ? SIGNAL_PULSE : undefined}
                    aria-hidden="true"
                />
            )}
            {t(stream.state)}
        </Badge>
    );
}
