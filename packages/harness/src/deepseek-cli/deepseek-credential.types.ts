/** What the DeepSeek wallet behind the stored key can still pay for. */
export interface DeepseekWallet {
    readonly apiKey: string;
    /** DeepSeek's own verdict on whether this wallet may still be spent. */
    readonly available: boolean;
    /** The balance as DeepSeek stated it, currency included, exactly as it was written. */
    readonly balance: string | null;
}

export type ResolveDeepseekWallet = (signal?: AbortSignal) => Promise<DeepseekWallet>;
