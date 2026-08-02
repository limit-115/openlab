import type { EventType } from "@lab/protocol/constants";

export interface AppendEventInput {
    readonly id: string;
    readonly labId: string;
    readonly type: EventType;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly occurredAt?: Date;
}
