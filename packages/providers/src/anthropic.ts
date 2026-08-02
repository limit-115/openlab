import Anthropic, { type ClientOptions } from "@anthropic-ai/sdk";
import type {
    MessageCreateParamsNonStreaming,
    MessageParam,
    Tool
} from "@anthropic-ai/sdk/resources/messages/messages";
import type { ModelProvider } from "@lab/protocol/provider";
import {
    type ModelRequest,
    ModelRequestSchema,
    type ModelResponse,
    ModelResponseSchema
} from "@lab/protocol/schemas";
import {
    MissingProviderCredentialError,
    ProviderCapabilityError,
    ProviderError
} from "#src/errors";
import { runProviderOperation } from "#src/retry";
import { validateStructuredOutput } from "#src/structured-output";
import { parseToolDefinitions } from "#src/tool-definition";
import type { ProviderRuntimeOptions } from "#src/types";

const PROVIDER_ID = "anthropic";

export interface AnthropicProviderOptions extends ProviderRuntimeOptions {
    readonly model: string;
    readonly apiKey?: string;
    readonly maxTokens?: number;
    readonly client?: Anthropic;
    readonly clientOptions?: Omit<ClientOptions, "apiKey" | "maxRetries">;
}

export class AnthropicProvider implements ModelProvider {
    readonly id = PROVIDER_ID;
    readonly model: string;
    readonly #client: Anthropic;
    readonly #maxTokens: number;
    readonly #runtimeOptions: ProviderRuntimeOptions;

    constructor(options: AnthropicProviderOptions) {
        const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
        if (!options.client && !apiKey?.trim()) {
            throw new MissingProviderCredentialError(PROVIDER_ID, "ANTHROPIC_API_KEY");
        }

        if (!options.model.trim()) {
            throw new ProviderError("invalid_request", "Anthropic model cannot be empty", {
                provider: PROVIDER_ID
            });
        }

        this.model = options.model;
        this.#maxTokens = options.maxTokens ?? 8_192;
        this.#runtimeOptions = options;
        this.#client =
            options.client ??
            new Anthropic({
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
            throw new ProviderError("invalid_request", "Invalid Anthropic model request", {
                provider: PROVIDER_ID,
                cause: error
            });
        }

        const { messages, system } = toAnthropicMessages(parsedRequest);
        const tools = toAnthropicTools(parsedRequest);

        return runProviderOperation(
            PROVIDER_ID,
            async (operationSignal) => {
                const body: MessageCreateParamsNonStreaming = {
                    model: this.model,
                    max_tokens: this.#maxTokens,
                    messages,
                    ...(system.length === 0 ? {} : { system: system.join("\n\n") }),
                    ...(parsedRequest.temperature === undefined
                        ? {}
                        : { temperature: parsedRequest.temperature }),
                    ...(tools.length === 0 ? {} : { tools }),
                    ...(parsedRequest.response_schema === undefined
                        ? {}
                        : {
                              output_config: {
                                  format: {
                                      type: "json_schema",
                                      schema: parsedRequest.response_schema
                                  }
                              }
                          })
                };

                const response = await this.#client.messages.create(body, {
                    signal: operationSignal
                });
                const text = response.content
                    .filter((block) => block.type === "text")
                    .map((block) => block.text)
                    .join("\n");
                const content = text || JSON.stringify(response.content);
                const structured = parsedRequest.response_schema
                    ? validateStructuredOutput(content, parsedRequest.response_schema, PROVIDER_ID)
                    : undefined;

                return ModelResponseSchema.parse({
                    provider: PROVIDER_ID,
                    model: response.model,
                    content,
                    ...(structured === undefined ? {} : { structured }),
                    usage: {
                        input_tokens: response.usage.input_tokens,
                        output_tokens: response.usage.output_tokens
                    }
                });
            },
            this.#runtimeOptions,
            parsedRequest.abort_after_ms,
            signal
        );
    }
}

function toAnthropicMessages(request: ModelRequest): {
    readonly messages: MessageParam[];
    readonly system: string[];
} {
    const messages: MessageParam[] = [];
    const system: string[] = [];

    for (const message of request.messages) {
        if (message.role === "system") {
            system.push(message.content);
            continue;
        }

        if (message.role === "tool") {
            throw new ProviderCapabilityError(
                PROVIDER_ID,
                "tool-result messages",
                "The common model protocol does not yet carry Anthropic tool-use ids"
            );
        }

        messages.push({
            role: message.role,
            content: message.name ? `[${message.name}]\n${message.content}` : message.content
        });
    }

    if (messages.length === 0) {
        throw new ProviderError(
            "invalid_request",
            "Anthropic requires at least one user or assistant message",
            {
                provider: PROVIDER_ID
            }
        );
    }

    return { messages, system };
}

function toAnthropicTools(request: ModelRequest): Tool[] {
    try {
        return parseToolDefinitions(request.tools).map((tool) => {
            if (tool.input_schema.type !== "object") {
                throw new TypeError(`Tool ${tool.name} input_schema.type must be object`);
            }

            return {
                name: tool.name,
                input_schema: {
                    ...tool.input_schema,
                    type: "object"
                },
                strict: true,
                ...(tool.description === undefined ? {} : { description: tool.description })
            };
        });
    } catch (error) {
        throw new ProviderError("invalid_request", "Invalid provider-neutral tool definition", {
            provider: PROVIDER_ID,
            cause: error
        });
    }
}
