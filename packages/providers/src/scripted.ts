import type { ModelProvider } from "@lab/protocol/provider";
import {
    type ModelRequest,
    ModelRequestSchema,
    type ModelResponse,
    ModelResponseSchema
} from "@lab/protocol/schemas";
import { ProviderError } from "#src/errors";
import { validateStructuredOutput } from "#src/structured-output";

export type ScriptedProviderStep =
    | ModelResponse
    | Error
    | ((request: ModelRequest, signal?: AbortSignal) => ModelResponse | Promise<ModelResponse>);

export interface ScriptedProviderOptions {
    readonly id?: string;
    readonly model?: string;
    readonly steps: readonly ScriptedProviderStep[];
}

export class ScriptedProvider implements ModelProvider {
    readonly id: string;
    readonly model: string;
    readonly requests: ModelRequest[] = [];
    readonly #steps: ScriptedProviderStep[];

    constructor(options: ScriptedProviderOptions) {
        this.id = options.id ?? "scripted";
        this.model = options.model ?? "deterministic";
        this.#steps = [...options.steps];
    }

    async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
        if (signal?.aborted) {
            throw new ProviderError("aborted", `${this.id} request was aborted`, {
                provider: this.id,
                cause: signal.reason
            });
        }

        const parsedRequest = ModelRequestSchema.parse(request);
        this.requests.push(structuredClone(parsedRequest));
        const step = this.#steps.shift();

        if (!step) {
            throw new ProviderError(
                "invalid_request",
                `${this.id} script has no remaining responses`,
                {
                    provider: this.id
                }
            );
        }

        if (step instanceof Error) {
            throw step;
        }

        const response = typeof step === "function" ? await step(parsedRequest, signal) : step;
        const parsedResponse = ModelResponseSchema.parse(response);

        if (!parsedRequest.response_schema) {
            return parsedResponse;
        }

        const structured = validateStructuredOutput(
            parsedResponse.content,
            parsedRequest.response_schema,
            this.id
        );

        return {
            ...parsedResponse,
            structured
        };
    }
}
