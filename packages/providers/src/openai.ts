import type { ModelProvider } from "@lab/protocol/provider";
import {
    type ModelRequest,
    ModelRequestSchema,
    type ModelResponse,
    ModelResponseSchema
} from "@lab/protocol/schemas";
import OpenAI, { type ClientOptions } from "openai";
import type {
    EasyInputMessage,
    FunctionTool,
    ResponseCreateParamsNonStreaming
} from "openai/resources/responses/responses";
import {
    InvalidProviderOutputError,
    MissingProviderCredentialError,
    ProviderCapabilityError,
    ProviderError
} from "#src/errors";
import { runProviderOperation } from "#src/retry";
import { validateStructuredOutput } from "#src/structured-output";
import { parseToolDefinitions } from "#src/tool-definition";
import type { ProviderRuntimeOptions } from "#src/types";

const PROVIDER_ID = "openai";

export interface OpenAIProviderOptions extends ProviderRuntimeOptions {
    readonly model: string;
    readonly apiKey?: string;
    readonly maxOutputTokens?: number;
    readonly client?: OpenAI;
    readonly clientOptions?: Omit<ClientOptions, "apiKey" | "maxRetries">;
}

export class OpenAIProvider implements ModelProvider {
    readonly id = PROVIDER_ID;
    readonly model: string;
    readonly #client: OpenAI;
    readonly #maxOutputTokens: number;
    readonly #runtimeOptions: ProviderRuntimeOptions;

    constructor(options: OpenAIProviderOptions) {
        const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
        if (!options.client && !apiKey?.trim()) {
            throw new MissingProviderCredentialError(PROVIDER_ID, "OPENAI_API_KEY");
        }

        if (!options.model.trim()) {
            throw new ProviderError("invalid_request", "OpenAI model cannot be empty", {
                provider: PROVIDER_ID
            });
        }

        this.model = options.model;
        this.#maxOutputTokens = options.maxOutputTokens ?? 8_192;
        this.#runtimeOptions = options;
        this.#client =
            options.client ??
            new OpenAI({
                ...options.clientOptions,
                apiKey,
                maxRetries: 0
            });
    }

    async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
        let parsedRequest: ModelRequest;
        try {
            parsedRequest = ModelRequestSchema.parse(request);
        } catch (error) {
            throw new ProviderError("invalid_request", "Invalid OpenAI model request", {
                provider: PROVIDER_ID,
                cause: error
            });
        }

        const input = toOpenAIInput(parsedRequest);
        const tools = toOpenAITools(parsedRequest);

        return runProviderOperation(
            PROVIDER_ID,
            async (operationSignal) => {
                const body: ResponseCreateParamsNonStreaming = {
                    model: this.model,
                    input,
                    max_output_tokens: this.#maxOutputTokens,
                    store: false,
                    ...(parsedRequest.temperature === undefined
                        ? {}
                        : { temperature: parsedRequest.temperature }),
                    ...(tools.length === 0 ? {} : { tools }),
                    ...(parsedRequest.response_schema === undefined
                        ? {}
                        : {
                              text: {
                                  format: {
                                      type: "json_schema",
                                      name: "lab_response",
                                      schema: parsedRequest.response_schema,
                                      strict: true
                                  }
                              }
                          })
                };

                const response = await this.#client.responses.create(body, {
                    signal: operationSignal
                });

                if (response.status === "failed" || response.status === "cancelled") {
                    throw new InvalidProviderOutputError(
                        PROVIDER_ID,
                        `OpenAI response ended with status ${response.status}`,
                        [response.error?.message ?? "No provider error details were returned"]
                    );
                }

                const content = response.output_text || JSON.stringify(response.output);
                const structured = parsedRequest.response_schema
                    ? validateStructuredOutput(content, parsedRequest.response_schema, PROVIDER_ID)
                    : undefined;

                return ModelResponseSchema.parse({
                    provider: PROVIDER_ID,
                    model: response.model,
                    content,
                    ...(structured === undefined ? {} : { structured }),
                    ...(response.usage
                        ? {
                              usage: {
                                  input_tokens: response.usage.input_tokens,
                                  output_tokens: response.usage.output_tokens
                              }
                          }
                        : {})
                });
            },
            this.#runtimeOptions,
            parsedRequest.abort_after_ms,
            signal
        );
    }
}

function toOpenAIInput(request: ModelRequest): EasyInputMessage[] {
    return request.messages.map((message) => {
        if (message.role === "tool") {
            throw new ProviderCapabilityError(
                PROVIDER_ID,
                "tool-result messages",
                "The common model protocol does not yet carry Responses API function-call ids"
            );
        }

        return {
            type: "message",
            role: message.role,
            content: message.name ? `[${message.name}]\n${message.content}` : message.content
        };
    });
}

function toOpenAITools(request: ModelRequest): FunctionTool[] {
    try {
        return parseToolDefinitions(request.tools).map((tool) => ({
            type: "function",
            name: tool.name,
            parameters: tool.input_schema,
            strict: true,
            ...(tool.description === undefined ? {} : { description: tool.description })
        }));
    } catch (error) {
        throw new ProviderError("invalid_request", "Invalid provider-neutral tool definition", {
            provider: PROVIDER_ID,
            cause: error
        });
    }
}
