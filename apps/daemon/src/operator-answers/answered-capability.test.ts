import type { OperatorReply } from "@nightlab/notifier/notification-message.types";
import { describe, expect, it } from "vitest";
import { capabilityAnsweredBy } from "#src/operator-answers/answered-capability";
import { ReplyResolution } from "#src/operator-answers/operator-answers.const";
import type { AskedCapability, OpenCapability } from "#src/operator-answers/operator-answers.types";

const CREDENTIAL: OpenCapability = {
    investigationId: "investigation-one",
    capabilityId: "capability-one",
    need: "An API key for the block explorer"
};

const MAINNET: OpenCapability = {
    investigationId: "investigation-two",
    capabilityId: "capability-two",
    need: "Permission to read the mainnet node"
};

const ASKED: readonly AskedCapability[] = [
    {
        investigationId: CREDENTIAL.investigationId,
        capabilityId: CREDENTIAL.capabilityId,
        reference: "11"
    },
    {
        investigationId: MAINNET.investigationId,
        capabilityId: MAINNET.capabilityId,
        reference: "22"
    }
];

function said(text: string, answers?: string): OperatorReply {
    return {
        text,
        sentAt: new Date("2026-08-05T12:00:00Z"),
        ...(answers === undefined ? {} : { answers })
    };
}

describe("capabilityAnsweredBy", () => {
    it("answers the question asked in the message the operator replied to", () => {
        const answered = capabilityAnsweredBy(said("here it is", "22"), ASKED, [
            CREDENTIAL,
            MAINNET
        ]);

        expect(answered).toEqual({ resolution: ReplyResolution.ANSWERED, capability: MAINNET });
    });

    /**
     * A chat carries one conversation at a time on a phone. Somebody who reads one question and
     * types an answer has answered that question, and refusing it because they did not swipe first
     * is the lab standing on ceremony while an investigation waits.
     */
    it("takes an answer written into the chat when the lab is only holding one question", () => {
        const answered = capabilityAnsweredBy(said("use the staging key"), ASKED, [CREDENTIAL]);

        expect(answered).toEqual({ resolution: ReplyResolution.ANSWERED, capability: CREDENTIAL });
    });

    /**
     * Guessing would put a credential meant for one agent into another's hands, and neither the
     * operator nor the lab would ever see it happen.
     */
    it("guesses at nothing when the lab is holding more than one question", () => {
        const answered = capabilityAnsweredBy(said("use the staging key"), ASKED, [
            CREDENTIAL,
            MAINNET
        ]);

        expect(answered).toEqual({
            resolution: ReplyResolution.SEVERAL_ASKED,
            open: [CREDENTIAL, MAINNET]
        });
    });

    it("makes nothing of a remark in a chat the lab is waiting on nothing in", () => {
        const answered = capabilityAnsweredBy(said("thanks"), ASKED, []);

        expect(answered).toEqual({ resolution: ReplyResolution.NOTHING_ASKED });
    });

    /**
     * The operator pointed at something, and it is not what the lab is waiting on: they answered a
     * question already answered, or replied to a message about something else entirely. Falling
     * through to the only open question would answer one nobody pointed at.
     */
    it("does not redirect a reply to an answered question onto the one still open", () => {
        const answered = capabilityAnsweredBy(said("as I said", "22"), ASKED, [CREDENTIAL]);

        expect(answered).toEqual({ resolution: ReplyResolution.NOTHING_ASKED });
    });

    it("makes nothing of a reply to a message the lab never asked anything in", () => {
        const answered = capabilityAnsweredBy(said("ok", "99"), ASKED, [CREDENTIAL]);

        expect(answered).toEqual({ resolution: ReplyResolution.NOTHING_ASKED });
    });
});
