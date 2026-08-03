import { createInterface } from "node:readline";
import { execa } from "execa";
import { z } from "zod";
import { CODEX_BINARY } from "#src/codex-cli/codex-cli.const";
import { allowanceDeadline } from "#src/subscription-allowance/allowance-deadline";
import { CodexAppServer } from "#src/subscription-allowance/subscription-allowance.const";

const INITIALIZE_ID = 1;
const REQUEST_ID = 2;

const AppServerAnswerSchema = z.looseObject({
    id: z.number().int(),
    result: z.unknown(),
    error: z.looseObject({ message: z.string().trim().min(1) }).nullish()
});

/**
 * Asks the local Codex CLI one app-server question. Two details are load-bearing: the request has
 * to carry a null `params`, and stdin has to stay open until the answer arrives, because the server
 * shuts down on end-of-input and would exit having answered only the handshake.
 */
export async function requestCodexAppServer(
    method: string,
    signal?: AbortSignal
): Promise<unknown> {
    const child = execa(CODEX_BINARY, [CodexAppServer.COMMAND], {
        reject: false,
        buffer: { stdout: false, stderr: true },
        stripFinalNewline: false,
        cancelSignal: allowanceDeadline(signal),
        forceKillAfterDelay: 5_000
    });
    const { stdin, stdout } = child;
    if (stdin === undefined || stdout === undefined) {
        child.kill();
        throw new Error("Codex app-server did not open a stdio channel");
    }

    try {
        for (const call of handshake(method)) {
            stdin.write(`${JSON.stringify(call)}\n`);
        }
        for await (const line of createInterface({ input: stdout })) {
            const answer = AppServerAnswerSchema.safeParse(parseLine(line));
            if (!answer.success || answer.data.id !== REQUEST_ID) {
                continue;
            }
            if (answer.data.error !== null && answer.data.error !== undefined) {
                throw new Error(`Codex refused ${method}: ${answer.data.error.message}`);
            }
            return answer.data.result;
        }

        throw new Error(`Codex app-server closed before answering ${method}`);
    } finally {
        stdin.end();
        child.kill();
        await child;
    }
}

function handshake(method: string): readonly unknown[] {
    return [
        {
            jsonrpc: CodexAppServer.PROTOCOL_VERSION,
            id: INITIALIZE_ID,
            method: CodexAppServer.INITIALIZE,
            params: {
                clientInfo: {
                    name: CodexAppServer.CLIENT_NAME,
                    title: CodexAppServer.CLIENT_NAME,
                    version: "1"
                }
            }
        },
        { jsonrpc: CodexAppServer.PROTOCOL_VERSION, method: CodexAppServer.INITIALIZED },
        { jsonrpc: CodexAppServer.PROTOCOL_VERSION, id: REQUEST_ID, method, params: null }
    ];
}

function parseLine(line: string): unknown {
    try {
        return JSON.parse(line);
    } catch {
        return undefined;
    }
}
