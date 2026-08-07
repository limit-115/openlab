import type { WalletBalance } from "#src/harness-allowance/harness-allowance.types";

/** What the DeepSeek wallet behind the stored key can still pay for. */
export interface DeepseekWallet {
    readonly apiKey: string;
    /** DeepSeek's own verdict on whether this wallet may still be spent. */
    readonly available: boolean;
    /**
     * What is left, per currency, exactly as DeepSeek wrote it. A wallet can hold more than one and
     * DeepSeek says whether it may be spent across all of them at once, so every entry is carried:
     * naming one would show an operator less money than they have, and folding them into a total
     * would invent a rate between currencies that no vendor stated.
     */
    readonly balances: readonly WalletBalance[];
}

export type ResolveDeepseekWallet = (signal?: AbortSignal) => Promise<DeepseekWallet>;
