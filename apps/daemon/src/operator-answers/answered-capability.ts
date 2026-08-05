import type { OperatorReply } from "@lab/notifier/notification-message.types";
import { ReplyResolution } from "#src/operator-answers/operator-answers.const";
import type { AskedCapability, OpenCapability } from "#src/operator-answers/operator-answers.types";

/**
 * Which question an answer is an answer to. Either the reply quotes the message the question was
 * asked in, or the lab is only holding one question and there is nothing else it could be about.
 */
export type AnsweredCapability =
    | { readonly resolution: typeof ReplyResolution.ANSWERED; readonly capability: OpenCapability }
    | { readonly resolution: typeof ReplyResolution.NOTHING_ASKED }
    | {
          readonly resolution: typeof ReplyResolution.SEVERAL_ASKED;
          readonly open: readonly OpenCapability[];
      };

/**
 * What the operator just answered. A reply that quotes a message the lab remembers asking is that
 * question and no other, whatever else is open; a reply that quotes nothing is taken as the answer
 * to the one open question, and refused where there is more than one.
 *
 * Guessing between several would put a credential meant for one agent into another's hands, and the
 * operator would never see it happen. So the lab says it does not know, and the operator can say
 * which by replying to the message rather than writing into the chat.
 */
export function capabilityAnsweredBy(
    reply: OperatorReply,
    asked: readonly AskedCapability[],
    open: readonly OpenCapability[]
): AnsweredCapability {
    const quoted = quotedCapability(reply, asked, open);
    if (quoted !== undefined) {
        return { resolution: ReplyResolution.ANSWERED, capability: quoted };
    }
    if (reply.answers !== undefined) {
        /**
         * The operator pointed at something, and it is not a question the lab is still holding —
         * they answered something already answered, or replied to a message about something else.
         * Falling through to the only open question would answer a question nobody pointed at.
         */
        return { resolution: ReplyResolution.NOTHING_ASKED };
    }
    const [only, ...rest] = open;
    if (only === undefined) {
        return { resolution: ReplyResolution.NOTHING_ASKED };
    }
    if (rest.length > 0) {
        return { resolution: ReplyResolution.SEVERAL_ASKED, open };
    }
    return { resolution: ReplyResolution.ANSWERED, capability: only };
}

/** The question asked in the message this reply quotes, where the lab is still held up by it. */
function quotedCapability(
    reply: OperatorReply,
    asked: readonly AskedCapability[],
    open: readonly OpenCapability[]
): OpenCapability | undefined {
    if (reply.answers === undefined) {
        return undefined;
    }
    const question = asked.find(({ reference }) => reference === reply.answers);
    if (question === undefined) {
        return undefined;
    }
    return open.find(
        (candidate) =>
            candidate.investigationId === question.investigationId &&
            candidate.capabilityId === question.capabilityId
    );
}
