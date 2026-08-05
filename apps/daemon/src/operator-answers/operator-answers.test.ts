import type { NotificationMessage, OperatorReply } from "@lab/notifier/notification-message.types";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsSchema } from "@lab/protocol/operator-notifications/notification-settings.schema";
import { describe, expect, it, vi } from "vitest";
import { OperatorAnswers } from "#src/operator-answers/operator-answers";
import type { ListeningChat, OpenCapability } from "#src/operator-answers/operator-answers.types";
import { NOTIFICATION_PHRASES } from "#src/operator-notifications/notification-phrasing.const";

const EN = NOTIFICATION_PHRASES.en;

const OPEN: OpenCapability = {
    investigationId: "investigation-one",
    capabilityId: "capability-one",
    need: "An API key for the block explorer"
};

function settings({ enabled = true, answersBack = true } = {}) {
    const stored = NotificationSettingsSchema.parse({
        channels: [
            {
                kind: NotificationChannelKind.TELEGRAM,
                enabled,
                bot_token: "1234:secret",
                chat_id: "-1001",
                answers_back: answersBack
            }
        ]
    });
    return { read: () => stored };
}

function said(text: string, answers?: string): OperatorReply {
    return {
        text,
        sentAt: new Date("2026-08-05T12:00:00Z"),
        ...(answers === undefined ? {} : { answers })
    };
}

interface LabState {
    open?: readonly OpenCapability[];
    spoken?: readonly OperatorReply[];
    takes?: boolean;
}

function listening({ open = [OPEN], spoken = [], takes = true }: LabState = {}) {
    const answered: { investigationId: string; capabilityId: string; answer: string }[] = [];
    const written: NotificationMessage[] = [];
    const opened: ListeningChat[] = [];
    const read = vi.fn(async () => spoken);
    const answers = new OperatorAnswers({
        settings: settings(),
        investigations: {
            openCapabilities: () => open,
            answerCapability: async (investigationId, capabilityId, answer) => {
                answered.push({ investigationId, capabilityId, answer });
                return takes;
            }
        },
        say: async (write) => {
            written.push(write("en"));
        },
        openConversation: (chat) => {
            opened.push(chat);
            return { read };
        }
    });
    return { answers, answered, written, opened, read };
}

/** A lab with a question open and a chat it has not been told it may read. */
function notListening(
    stored: ReturnType<typeof settings>,
    read: () => Promise<readonly OperatorReply[]>
) {
    return new OperatorAnswers({
        settings: stored,
        investigations: {
            openCapabilities: () => [OPEN],
            answerCapability: async () => true
        },
        say: async () => undefined,
        openConversation: () => ({ read })
    });
}

describe("OperatorAnswers", () => {
    it("carries what the operator wrote to the agent that asked for it", async () => {
        const lab = listening({ spoken: [said("use the staging key")] });

        await lab.answers.collect();

        expect(lab.answered).toEqual([
            {
                investigationId: OPEN.investigationId,
                capabilityId: OPEN.capabilityId,
                answer: "use the staging key"
            }
        ]);
    });

    /** An answer that unblocked a run and one that went nowhere look identical from a chat. */
    it("says in the chat that the answer reached the agent", async () => {
        const lab = listening({ spoken: [said("use the staging key")] });

        await lab.answers.collect();

        expect(lab.written).toEqual([
            expect.objectContaining({
                title: EN.answerTakenTitle,
                facts: [{ label: EN.why, value: OPEN.need }]
            })
        ]);
    });

    it("names what it is holding rather than guessing between two open questions", async () => {
        const other = { ...OPEN, capabilityId: "capability-two", need: "A mainnet node" };
        const lab = listening({ open: [OPEN, other], spoken: [said("use the staging key")] });

        await lab.answers.collect();

        expect(lab.answered).toEqual([]);
        expect(lab.written).toEqual([
            expect.objectContaining({
                title: EN.severalAskedTitle,
                facts: [
                    { label: EN.waitingOn, value: OPEN.need },
                    { label: EN.waitingOn, value: other.need }
                ]
            })
        ]);
    });

    /**
     * A question the lab asked in a particular message is answered by a reply to that message,
     * whatever else has come open since.
     */
    it("answers the question a reply quotes rather than the one that came open after it", async () => {
        const later = { ...OPEN, capabilityId: "capability-two", need: "A mainnet node" };
        const lab = listening({ open: [OPEN, later], spoken: [said("here it is", "77")] });
        lab.answers.remember({
            investigationId: OPEN.investigationId,
            capabilityId: OPEN.capabilityId,
            reference: "77"
        });

        await lab.answers.collect();

        expect(lab.answered).toEqual([
            {
                investigationId: OPEN.investigationId,
                capabilityId: OPEN.capabilityId,
                answer: "here it is"
            }
        ]);
    });

    /** The dashboard and the chat answer the same requests, and either can get there first. */
    it("says so when the request was already answered somewhere else", async () => {
        const lab = listening({ spoken: [said("use the staging key")], takes: false });

        await lab.answers.collect();

        expect(lab.written).toEqual([expect.objectContaining({ title: EN.nothingAskedTitle })]);
    });

    /**
     * Whoever can write in the chat is answering for the operator. A lab that read it before being
     * told to would be taking instructions from a group the operator only meant to report into.
     */
    it("reads nothing until the operator has opened the chat to answering", async () => {
        const read = vi.fn(async () => []);

        await notListening(settings({ answersBack: false }), read).collect();

        expect(read).not.toHaveBeenCalled();
    });

    it("stops reading a channel that has been switched off altogether", async () => {
        const read = vi.fn(async () => []);

        await notListening(settings({ enabled: false }), read).collect();

        expect(read).not.toHaveBeenCalled();
    });

    /** Reading is one long wait each time, and reopening it every round would drop that wait. */
    it("keeps one reading of the chat open across reads", async () => {
        const lab = listening();

        await lab.answers.collect();
        await lab.answers.collect();

        expect(lab.opened).toHaveLength(1);
        expect(lab.read).toHaveBeenCalledTimes(2);
    });
});
