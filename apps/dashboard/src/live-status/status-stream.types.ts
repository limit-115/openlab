import type { StreamState } from "#src/live-status/status-stream.const";

export interface LiveStatus {
    state: StreamState;
    /** Why the last frame could not be read, when the stream delivered something unparseable. */
    protocolError?: string;
}
