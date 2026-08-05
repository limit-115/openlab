import type { OperatorReply } from "@lab/notifier/notification-message.types";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { capabilityAnsweredBy } from "#src/operator-answers/answered-capability";
import {
    REMEMBERED_QUESTIONS,
    REPLY_RETRY_MS,
    ReplyResolution
} from "#src/operator-answers/operator-answers.const";
import type {
    AskedCapability,
    ListeningChat,
    OperatorAnswersOptions,
    OperatorConversation
} from "#src/operator-answers/operator-answers.types";
import {
    capabilityAnsweredMessage,
    nothingAskedMessage,
    severalAskedMessage
} from "#src/operator-notifications/notification-phrasing";

/**
 * The lab listening to the chat it writes to. A capability request is the one moment the lab
 * reports that it is also held up by, so the operator answering where they read it is the whole
 * point: they are not being told to go and open the lab, they are unblocking it from their phone.
 *
 * Nothing here waits on research and research never waits on this. A chat that cannot be read is
 * written down and tried again, because the dashboard answers the same requests either way.
 */
export class OperatorAnswers {
    readonly #options: OperatorAnswersOptions;
    readonly #listeningSince: Date;
    readonly #retryMs: number;
    /** The questions the lab has asked, newest last, so a reply can be tied back to one. */
    #asked: AskedCapability[] = [];
    #conversation: { chat: ListeningChat; reading: OperatorConversation } | undefined;
    #closing: AbortController | undefined;
    #listening: Promise<void> | undefined;

    constructor(options: OperatorAnswersOptions) {
        this.#options = options;
        this.#listeningSince = options.listeningSince ?? new Date();
        this.#retryMs = options.retryMs ?? REPLY_RETRY_MS;
    }

    /**
     * Remembers that a question went out in a particular message. Only the last so many are kept:
     * the memory exists to recognise a reply, and a chat nobody has answered in that long has moved
     * on to other things.
     */
    remember(asked: AskedCapability): void {
        if (asked.reference === undefined) {
            return;
        }
        this.#asked = [...this.#asked, asked].slice(-REMEMBERED_QUESTIONS);
    }

    /**
     * Reads the chat once and answers with whatever was said. A lab whose operator has opened no
     * chat to answering reads nothing, which is the ordinary state of one that never will.
     */
    async collect(signal?: AbortSignal): Promise<void> {
        const reading = this.#reading();
        if (reading === undefined) {
            return;
        }
        for (const reply of await reading.read(signal)) {
            await this.#answer(reply);
        }
    }

    start(): void {
        this.#closing ??= new AbortController();
        this.#listening ??= this.#listen(this.#closing.signal);
    }

    async close(): Promise<void> {
        this.#closing?.abort();
        await this.#listening?.catch(() => undefined);
        this.#listening = undefined;
        this.#closing = undefined;
    }

    /**
     * Reads for as long as the lab is up. A read that fails is written down and waited out rather
     * than retried at once: the chat being unreachable is the ordinary shape of a laptop asleep.
     */
    async #listen(signal: AbortSignal): Promise<void> {
        while (!signal.aborted) {
            try {
                await this.collect(signal);
                if (this.#reading() === undefined) {
                    await this.#pause(signal);
                }
            } catch (error) {
                if (signal.aborted) {
                    return;
                }
                this.#options.onFailure?.(error);
                await this.#pause(signal);
            }
        }
    }

    #pause(signal: AbortSignal): Promise<void> {
        return new Promise((settle) => {
            const timer = setTimeout(settle, this.#retryMs);
            signal.addEventListener(
                "abort",
                () => {
                    clearTimeout(timer);
                    settle();
                },
                { once: true }
            );
        });
    }

    /**
     * The chat as it stands right now. Credentials are read every time round rather than held, so
     * switching the way in off closes it before the next read rather than after a restart.
     */
    #reading(): OperatorConversation | undefined {
        const chat = this.#listeningChat();
        if (chat === undefined) {
            this.#conversation = undefined;
            return undefined;
        }
        if (
            this.#conversation?.chat.botToken !== chat.botToken ||
            this.#conversation.chat.chatId !== chat.chatId
        ) {
            this.#conversation = {
                chat,
                reading: this.#options.openConversation(chat, this.#listeningSince)
            };
        }
        return this.#conversation.reading;
    }

    #listeningChat(): ListeningChat | undefined {
        const configured = this.#options.settings
            .read()
            .channels.find((channel) => channel.kind === NotificationChannelKind.TELEGRAM);
        if (configured === undefined || !configured.enabled || !configured.answers_back) {
            return undefined;
        }
        return { botToken: configured.bot_token, chatId: configured.chat_id };
    }

    /**
     * One thing the operator said, carried to the agent that asked. What the lab writes back is the
     * receipt: an answer that went nowhere and an answer that unblocked an investigation look
     * identical from the chat, and the operator has already put the phone down.
     */
    async #answer(reply: OperatorReply): Promise<void> {
        const open = this.#options.investigations.openCapabilities();
        const answered = capabilityAnsweredBy(reply, this.#asked, open);
        if (answered.resolution === ReplyResolution.NOTHING_ASKED) {
            await this.#options.say(nothingAskedMessage);
            return;
        }
        if (answered.resolution === ReplyResolution.SEVERAL_ASKED) {
            await this.#options.say((language) => severalAskedMessage(language, answered.open));
            return;
        }
        const { capability } = answered;
        const taken = await this.#options.investigations.answerCapability(
            capability.investigationId,
            capability.capabilityId,
            reply.text
        );
        await this.#options.say((language) =>
            taken ? capabilityAnsweredMessage(language, capability) : nothingAskedMessage(language)
        );
    }
}
