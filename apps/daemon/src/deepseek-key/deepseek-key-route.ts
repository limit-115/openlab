import {
    forgetDeepseekApiKey,
    readDeepseekApiKey,
    writeDeepseekApiKey
} from "@openlab/harness/deepseek-credential";
import { DeepseekKeySchema } from "@openlab/protocol/deepseek-key/deepseek-key.schema";
import type { DeepseekKeyState } from "@openlab/protocol/deepseek-key/deepseek-key.types";
import type { FastifyInstance } from "fastify";
import { DEEPSEEK_KEY_ROUTE, DeepseekKeyError } from "#src/deepseek-key/deepseek-key.const";

/**
 * Takes the DeepSeek key the operator typed, and gives it back up when they ask.
 *
 * DeepSeek is the one harness whose credential the lab holds rather than reads from a login some
 * other program made, so this is the only place a secret enters the lab from a page. It goes
 * straight to the credential file and is never read back out over HTTP: the answer to every request
 * here is whether the lab is holding a key, not which one.
 */
export function registerDeepseekKeyRoute(app: FastifyInstance): void {
    app.get(
        DEEPSEEK_KEY_ROUTE,
        async (): Promise<DeepseekKeyState> => ({
            key_set: await isKeyHeld()
        })
    );

    app.put(DEEPSEEK_KEY_ROUTE, async (request, reply) => {
        const parsed = DeepseekKeySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: DeepseekKeyError.INVALID_KEY });
        }

        try {
            await writeDeepseekApiKey(parsed.data.api_key);
        } catch (error) {
            return reply.code(500).send({
                error: `${DeepseekKeyError.UNWRITABLE}: ${error instanceof Error ? error.message : String(error)}`
            });
        }

        return { key_set: true } satisfies DeepseekKeyState;
    });

    /**
     * Forgetting the key is how an operator stops the lab spending their DeepSeek wallet. It takes
     * effect on the next dispatch without anything being restarted, because every DeepSeek run reads
     * the credential file rather than a copy taken when the lab opened.
     */
    app.delete(DEEPSEEK_KEY_ROUTE, async (): Promise<DeepseekKeyState> => {
        await forgetDeepseekApiKey();
        return { key_set: false };
    });
}

async function isKeyHeld(): Promise<boolean> {
    try {
        await readDeepseekApiKey();
        return true;
    } catch {
        return false;
    }
}
