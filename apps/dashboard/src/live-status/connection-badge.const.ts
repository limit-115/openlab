import { StreamState } from "#src/live-status/status-stream.const";

export const CONNECTION_BADGE =
    "inline-flex items-center gap-[6px] rounded-full border px-[9px] py-[6px] text-[10px] font-[650] max-[620px]:col-span-full max-[620px]:justify-self-start" as const;

export const CONNECTION_BADGE_TONE: Record<StreamState, string> = {
    [StreamState.CONNECTING]: "border-amber/24 bg-surface-soft text-amber",
    [StreamState.LIVE]: "border-green/25 bg-green/12 text-green",
    [StreamState.RECONNECTING]: "border-amber/24 bg-surface-soft text-amber",
    [StreamState.UNAVAILABLE]: "border-red/22 bg-surface-soft text-red"
};

export const CONNECTION_BADGE_LABEL: Record<StreamState, string> = {
    [StreamState.CONNECTING]: "Connecting",
    [StreamState.LIVE]: "Live",
    [StreamState.RECONNECTING]: "Reconnecting",
    [StreamState.UNAVAILABLE]: "Offline"
};

export const SIGNAL_PULSE = "animate-signal-pulse motion-reduce:animate-none" as const;
