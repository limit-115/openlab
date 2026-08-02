import type { ModelProvider } from "@lab/protocol/provider";
import { ProviderCapabilityError, ProviderError } from "#src/errors";
import type { ProviderFactory } from "#src/types";

export class ProviderRegistry {
    readonly #factories = new Map<string, ProviderFactory>();
    readonly #instances = new Map<string, ModelProvider>();

    register(provider: ModelProvider): this {
        return this.registerFactory(provider.id, () => provider);
    }

    registerFactory(id: string, factory: ProviderFactory): this {
        const normalizedId = id.trim();
        if (normalizedId.length === 0) {
            throw new ProviderError("invalid_request", "Provider id cannot be empty", {
                provider: "registry"
            });
        }

        if (this.#factories.has(normalizedId)) {
            throw new ProviderError(
                "invalid_request",
                `Provider ${normalizedId} is already registered`,
                {
                    provider: normalizedId
                }
            );
        }

        this.#factories.set(normalizedId, factory);
        return this;
    }

    has(id: string): boolean {
        return this.#factories.has(id);
    }

    get(id: string): ModelProvider {
        const existing = this.#instances.get(id);
        if (existing) {
            return existing;
        }

        const factory = this.#factories.get(id);
        if (!factory) {
            throw new ProviderCapabilityError(
                "registry",
                `model provider ${id}`,
                `No provider with id ${id} is registered`
            );
        }

        const provider = factory();
        if (provider.id !== id) {
            throw new ProviderError(
                "invalid_request",
                `Provider factory ${id} produced a provider with id ${provider.id}`,
                { provider: id }
            );
        }

        this.#instances.set(id, provider);
        return provider;
    }

    ids(): readonly string[] {
        return [...this.#factories.keys()].sort();
    }
}
