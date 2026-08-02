import { StreamState } from "#src/live-status/status-stream.const";
import type { BadgeVariant } from "#src/status-tag/status-tag.types";

export const CONNECTION_BADGE_TONE: Record<StreamState, BadgeVariant> = {
    [StreamState.CONNECTING]: "outline",
    [StreamState.LIVE]: "default",
    [StreamState.RECONNECTING]: "outline",
    [StreamState.UNAVAILABLE]: "destructive"
};

export const CONNECTION_BADGE_LABEL: Record<StreamState, string> = {
    [StreamState.CONNECTING]: "Connecting",
    [StreamState.LIVE]: "Live",
    [StreamState.RECONNECTING]: "Reconnecting",
    [StreamState.UNAVAILABLE]: "Offline"
};

export const SIGNAL_PULSE = "animate-pulse motion-reduce:animate-none" as const;
