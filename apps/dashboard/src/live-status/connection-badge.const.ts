import { StreamState } from "#src/live-status/status-stream.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

/** The same four colours the statuses use: a stream still reaching for the lab is waiting, not fine. */
export const CONNECTION_BADGE_TONE: Record<StreamState, BadgeVariant> = {
    [StreamState.CONNECTING]: "warning",
    [StreamState.LIVE]: "default",
    [StreamState.RECONNECTING]: "warning",
    [StreamState.UNAVAILABLE]: "destructive"
};

export const SIGNAL_PULSE = "animate-pulse motion-reduce:animate-none" as const;
