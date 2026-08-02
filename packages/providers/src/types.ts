import type { ModelProvider } from "@lab/protocol/provider";

export interface ProviderRetryOptions {
    readonly retries?: number;
    readonly minDelayMs?: number;
    readonly maxDelayMs?: number;
}

export interface ProviderRuntimeOptions {
    readonly timeoutMs?: number;
    readonly retry?: ProviderRetryOptions;
}

export interface ProviderToolDefinition {
    readonly name: string;
    readonly description?: string;
    readonly input_schema: Readonly<Record<string, unknown>>;
}

export type ProviderFactory = () => ModelProvider;
