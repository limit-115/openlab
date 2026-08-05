import type {
    NotificationMessage,
    OperatorReply
} from "@nightlab/notifier/notification-message.types";
import type { NotificationLanguage } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import type { NotificationSettingsReader } from "#src/operator-notifications/operator-notifications.types";

/**
 * One question the lab has put to the operator through a channel, and what that channel called the
 * message it put it in. An answer quotes that message, which is how a chat carrying several
 * conversations at once says which of them is being answered.
 */
export interface AskedCapability {
    readonly investigationId: string;
    readonly capabilityId: string;
    /** What the channel named the message. Absent where the vendor names nothing. */
    readonly reference?: string;
}

/** A capability request the lab is still held up by, with enough of it to name it in a chat. */
export interface OpenCapability {
    readonly investigationId: string;
    readonly capabilityId: string;
    readonly need: string;
}

/**
 * The investigations an answer can land in. The lab holds several at once and a chat belongs to the
 * operator rather than to any one of them, so an answer is offered to the lab as a whole.
 */
export interface AnsweringInvestigations {
    openCapabilities(): readonly OpenCapability[];
    answerCapability(
        investigationId: string,
        capabilityId: string,
        answer: string
    ): Promise<boolean>;
}

/** Reads the chat the lab writes to. Injected so a test can speak as the operator. */
export interface OperatorConversation {
    read(signal?: AbortSignal): Promise<readonly OperatorReply[]>;
}

/** The credentials of the one chat the lab is reading, as the operator configured it. */
export interface ListeningChat {
    readonly botToken: string;
    readonly chatId: string;
}

export interface OperatorAnswersOptions {
    readonly settings: NotificationSettingsReader;
    readonly investigations: AnsweringInvestigations;
    /** Writes back into the chat, in the language that chat is read in. */
    readonly say: (write: (language: NotificationLanguage) => NotificationMessage) => Promise<void>;
    readonly openConversation: (chat: ListeningChat, listeningSince: Date) => OperatorConversation;
    /** When the lab started listening, so a day-old backlog is never read as an answer to now. */
    readonly listeningSince?: Date;
    readonly onFailure?: (error: unknown) => void;
    /** How long to wait before reading again after a failure, or while nobody is listening. */
    readonly retryMs?: number;
}
