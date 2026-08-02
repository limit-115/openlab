import type { StreamState } from "#src/live-status/status-stream.const";

export interface LiveStatus {
    state: StreamState;
    lastEventAt?: Date;
    protocolError?: string;
}
