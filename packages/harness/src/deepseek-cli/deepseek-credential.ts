import { mkdir, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import writeFileAtomic from "write-file-atomic";
import { z } from "zod";
import { HarnessTimeoutMilliseconds } from "#src/agent-harness/agent-harness.const";
import {
    DEEPSEEK_BALANCE_URL,
    DeepseekCredentialStore
} from "#src/deepseek-cli/deepseek-cli.const";
import type { DeepseekWallet } from "#src/deepseek-cli/deepseek-credential.types";

const StoredCredentialSchema = z.looseObject({
    api_key: z.string().trim().min(1)
});

/**
 * DeepSeek states a balance per currency and says outright whether the wallet may still be spent.
 * The amounts stay strings: they are decimal money, and reading them as floats would round the one
 * number an operator is here to check.
 */
const BalanceSchema = z.looseObject({
    is_available: z.boolean(),
    balance_infos: z.array(
        z.looseObject({
            currency: z.string().trim().min(1),
            total_balance: z.string().trim().min(1)
        })
    )
});

export function deepseekCredentialDirectory(): string {
    return join(homedir(), ...DeepseekCredentialStore.DIRECTORY_SEGMENTS);
}

export function deepseekCredentialPath(): string {
    return join(deepseekCredentialDirectory(), DeepseekCredentialStore.FILE_NAME);
}

/** The key the operator typed, as the harness needs it to hand a run to the CLI. */
export async function readDeepseekApiKey(): Promise<string> {
    const path = deepseekCredentialPath();
    let stored: unknown;
    try {
        stored = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
        throw new Error(`No DeepSeek key at ${path}`, { cause: error });
    }

    return StoredCredentialSchema.parse(stored).api_key;
}

/**
 * Keeps the key the operator handed the lab. It is written where only they can read it and it is
 * never written anywhere else: a credential in the lab's database would travel with an export and
 * survive in a backup nobody meant to keep a key in.
 */
export async function writeDeepseekApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (trimmed.length === 0) {
        throw new Error("A DeepSeek key cannot be empty");
    }

    await mkdir(deepseekCredentialDirectory(), {
        recursive: true,
        mode: DeepseekCredentialStore.DIRECTORY_MODE
    });
    await writeFileAtomic(deepseekCredentialPath(), `${JSON.stringify({ api_key: trimmed })}\n`, {
        mode: DeepseekCredentialStore.FILE_MODE
    });
}

/** Forgets the key. The harness then reports itself unauthenticated, which is the honest state. */
export async function forgetDeepseekApiKey(): Promise<void> {
    await rm(deepseekCredentialPath(), { force: true });
}

/**
 * Asks DeepSeek what the stored key can still spend. This is the whole of the DeepSeek preflight:
 * the endpoint answers only for a live key, and it answers with the one number that decides whether
 * a run started now can finish.
 */
export async function resolveDeepseekWallet(signal?: AbortSignal): Promise<DeepseekWallet> {
    const apiKey = await readDeepseekApiKey();
    const response = await fetch(DEEPSEEK_BALANCE_URL, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: signal ?? AbortSignal.timeout(HarnessTimeoutMilliseconds.PREFLIGHT)
    });
    if (!response.ok) {
        throw new Error(`DeepSeek refused the stored key (HTTP ${response.status})`);
    }

    const balance = BalanceSchema.parse(await response.json());
    /**
     * A wallet can hold more than one currency, and DeepSeek says whether it may be spent across all
     * of them at once. Naming only the first would show an operator less money than they have, or
     * none at all while another currency still pays, so every entry is stated.
     */
    const balances = balance.balance_infos.map((info) => `${info.total_balance} ${info.currency}`);
    return {
        apiKey,
        available: balance.is_available,
        balance: balances.length === 0 ? null : balances.join(" · ")
    };
}
