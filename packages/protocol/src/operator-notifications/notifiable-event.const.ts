import { EventType } from "#src/investigation-events/event-type.const";

/**
 * The moments worth interrupting an operator for. The lab records far more than this, and a message
 * for every run would teach whoever reads them to ignore the lot; each of these either asks the
 * operator for something the lab cannot get on its own, or reports that work has stopped.
 */
export const NOTIFIABLE_EVENT_TYPES = [
    EventType.BREAKTHROUGH_RECORDED,
    EventType.CAPABILITY_REQUESTED,
    EventType.INVESTIGATION_FAILED,
    /** How an investigation stops of its own accord: its leads are spent or nothing can run it. */
    EventType.INVESTIGATION_HIBERNATED,
    EventType.HARNESS_PREFLIGHT_FAILED
] as const;

export type NotifiableEventType = (typeof NOTIFIABLE_EVENT_TYPES)[number];

export function isNotifiableEvent(type: EventType): type is NotifiableEventType {
    return NOTIFIABLE_EVENT_TYPES.includes(type as NotifiableEventType);
}
