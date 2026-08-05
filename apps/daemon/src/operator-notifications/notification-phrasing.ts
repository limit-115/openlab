import type {
    NotificationFact,
    NotificationMessage
} from "@openlab/notifier/notification-message.types";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationEvent } from "@openlab/protocol/investigation-events/investigation-event.types";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import {
    isNotifiableEvent,
    type NotifiableEventType
} from "@openlab/protocol/operator-notifications/notifiable-event.const";
import type { NotificationLanguage } from "@openlab/protocol/operator-notifications/notification-channel.const";
import {
    NOTIFICATION_PHRASES,
    NotificationPayloadField,
    type NotificationPhrases
} from "#src/operator-notifications/notification-phrasing.const";

/**
 * One lab moment as a sentence somebody can act on, in the language a channel was configured with.
 * A moment the lab never offers to report has no wording, so it yields nothing rather than a
 * message about an event type.
 */
export function notificationMessage(
    event: InvestigationEvent,
    snapshot: StatusSnapshot,
    language: NotificationLanguage,
    labUrl: string
): NotificationMessage | undefined {
    if (!isNotifiableEvent(event.type)) {
        return undefined;
    }
    const phrases = NOTIFICATION_PHRASES[language];
    return {
        title: phrases.titles[event.type],
        body: eventBody(event, snapshot, phrases),
        facts: [
            { label: phrases.investigation, value: snapshot.investigation.goal },
            ...eventFacts(event, phrases)
        ],
        link: {
            label: phrases.openInTheLab,
            url: investigationAddress(labUrl, snapshot.investigation.id)
        },
        /**
         * The one moment the lab reports that it is also held up by. A channel that can carry an
         * answer offers to take one here, so the operator unblocks the lab where they read it.
         */
        ...(event.type === EventType.CAPABILITY_REQUESTED ? { awaitsAnswer: true } : {})
    };
}

/**
 * The receipt for something the operator said back. An answer that reached the agent that asked
 * and an answer that went nowhere look identical from a chat, and the operator has already put the
 * phone down, so the lab says which of the two it was.
 */
export function capabilityAnsweredMessage(
    language: NotificationLanguage,
    capability: { readonly need: string }
): NotificationMessage {
    const phrases = NOTIFICATION_PHRASES[language];
    return {
        title: phrases.answerTakenTitle,
        body: phrases.answerTakenBody,
        facts: [{ label: phrases.why, value: capability.need }]
    };
}

export function nothingAskedMessage(language: NotificationLanguage): NotificationMessage {
    const phrases = NOTIFICATION_PHRASES[language];
    return { title: phrases.nothingAskedTitle, body: phrases.nothingAskedBody, facts: [] };
}

/**
 * Names what the lab is holding, so the operator can point at one. Guessing between them would put
 * a credential meant for one agent into another's hands without anybody seeing it happen.
 */
export function severalAskedMessage(
    language: NotificationLanguage,
    open: readonly { readonly need: string }[]
): NotificationMessage {
    const phrases = NOTIFICATION_PHRASES[language];
    return {
        title: phrases.severalAskedTitle,
        body: phrases.severalAskedBody,
        facts: open.map(({ need }) => ({ label: phrases.waitingOn, value: need }))
    };
}

/** The lab reporting on itself rather than on any investigation, so it names no investigation. */
export function notificationTestMessage(
    language: NotificationLanguage,
    labUrl: string
): NotificationMessage {
    const phrases = NOTIFICATION_PHRASES[language];
    return {
        title: phrases.testTitle,
        body: phrases.testBody,
        facts: [],
        link: { label: phrases.openInTheLab, url: labUrl }
    };
}

/**
 * What actually happened, in the words whoever recorded it used. A breakthrough is the exception:
 * it is recorded by pointer, and the claim that survived verification has already been written into
 * the snapshot's result by the time the event lands.
 */
function eventBody(
    event: InvestigationEvent,
    snapshot: StatusSnapshot,
    phrases: NotificationPhrases
): string {
    const written = notedProse(event, snapshot);
    return written === undefined || written.length === 0 ? phrases.nothingRecorded : written;
}

function notedProse(event: InvestigationEvent, snapshot: StatusSnapshot): string | undefined {
    switch (event.type as NotifiableEventType) {
        case EventType.BREAKTHROUGH_RECORDED:
            return snapshot.result?.summary;
        case EventType.CAPABILITY_REQUESTED:
            return written(event, NotificationPayloadField.NEED);
        case EventType.HARNESS_PREFLIGHT_FAILED:
            return written(event, NotificationPayloadField.ERROR);
        case EventType.INVESTIGATION_FAILED:
        case EventType.INVESTIGATION_HIBERNATED:
            return written(event, NotificationPayloadField.REASON);
    }
}

function eventFacts(
    event: InvestigationEvent,
    phrases: NotificationPhrases
): readonly NotificationFact[] {
    switch (event.type as NotifiableEventType) {
        case EventType.CAPABILITY_REQUESTED:
            return labelled(phrases.why, written(event, NotificationPayloadField.REASON));
        case EventType.HARNESS_PREFLIGHT_FAILED:
            return labelled(phrases.harness, written(event, NotificationPayloadField.HARNESS));
        case EventType.BREAKTHROUGH_RECORDED:
        case EventType.INVESTIGATION_FAILED:
        case EventType.INVESTIGATION_HIBERNATED:
            return [];
    }
}

function labelled(label: string, value: string | undefined): readonly NotificationFact[] {
    return value === undefined || value.length === 0 ? [] : [{ label, value }];
}

/** An event payload is whatever its writer put there, so only prose that is prose is read out. */
function written(event: InvestigationEvent, field: string): string | undefined {
    const value = event.payload[field];
    return typeof value === "string" ? value : undefined;
}

function investigationAddress(labUrl: string, investigationId: string): string {
    return `${labUrl.replace(/\/+$/, "")}/investigations/${encodeURIComponent(investigationId)}`;
}
