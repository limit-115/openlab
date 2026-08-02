import type { ModelRequest, ModelResponse } from "@lab/protocol/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "#src/anthropic";
import {
    InvalidProviderOutputError,
    MissingProviderCredentialError,
    ProviderError
} from "#src/errors";
import { OpenAIProvider } from "#src/openai";
import { ProviderRegistry } from "#src/registry";
import { ScriptedProvider } from "#src/scripted";

const structuredRequest: ModelRequest = {
    messages: [
        { role: "system", content: "Return a measurement" },
        { role: "user", content: "Measure the candidate" }
    ],
    response_schema: {
        type: "object",
        properties: {
            score: { type: "number" }
        },
        required: ["score"],
        additionalProperties: false
    },
    tools: []
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe("OpenAIProvider", () => {
    it("uses the Responses API, retries transient failures, and validates structured output", async () => {
        const bodies: unknown[] = [];
        let attempts = 0;
        const fetchMock: typeof fetch = async (_input, init) => {
            attempts += 1;
            bodies.push(JSON.parse(String(init?.body)));
            if (attempts === 1) {
                return Response.json(
                    { error: { message: "temporary outage", type: "server_error" } },
                    { status: 500 }
                );
            }

            return Response.json(openAIResponse('{"score":0.91}'));
        };
        const provider = new OpenAIProvider({
            model: "gpt-test",
            apiKey: "test-key",
            clientOptions: { fetch: fetchMock },
            retry: { retries: 1, minDelayMs: 0, maxDelayMs: 0 }
        });

        const result = await provider.generate(structuredRequest);

        expect(attempts).toBe(2);
        expect(result.structured).toEqual({ score: 0.91 });
        expect(result.usage).toEqual({ input_tokens: 12, output_tokens: 4 });
        expect(bodies.at(-1)).toMatchObject({
            model: "gpt-test",
            store: false,
            text: {
                format: {
                    type: "json_schema",
                    name: "lab_response",
                    strict: true
                }
            }
        });
    });

    it("reports a missing credential as a capability request", () => {
        expect(() => new OpenAIProvider({ model: "gpt-test", apiKey: "" })).toThrow(
            MissingProviderCredentialError
        );

        try {
            new OpenAIProvider({ model: "gpt-test", apiKey: "" });
        } catch (error) {
            expect(error).toMatchObject({
                code: "missing_credential",
                provider: "openai",
                capabilityRequest: {
                    need: expect.stringContaining("OPENAI_API_KEY")
                }
            });
        }
    });
});

describe("AnthropicProvider", () => {
    it("uses Messages structured output and separates the system prompt", async () => {
        let body: Record<string, unknown> | undefined;
        const fetchMock: typeof fetch = async (_input, init) => {
            body = JSON.parse(String(init?.body));
            return Response.json({
                id: "msg_1",
                type: "message",
                role: "assistant",
                model: "claude-test",
                content: [{ type: "text", text: '{"score":0.82}' }],
                stop_reason: "end_turn",
                stop_sequence: null,
                container: null,
                stop_details: null,
                usage: {
                    input_tokens: 9,
                    output_tokens: 3,
                    cache_creation_input_tokens: null,
                    cache_read_input_tokens: null,
                    output_tokens_details: null,
                    server_tool_use: null,
                    service_tier: "standard"
                }
            });
        };
        const provider = new AnthropicProvider({
            model: "claude-test",
            apiKey: "test-key",
            clientOptions: { fetch: fetchMock },
            retry: { retries: 0 }
        });

        const result = await provider.generate(structuredRequest);

        expect(result.structured).toEqual({ score: 0.82 });
        expect(result.usage).toEqual({ input_tokens: 9, output_tokens: 3 });
        expect(body).toMatchObject({
            model: "claude-test",
            system: "Return a measurement",
            messages: [{ role: "user", content: "Measure the candidate" }],
            output_config: {
                format: { type: "json_schema" }
            }
        });
    });
});

describe("ScriptedProvider", () => {
    it("is deterministic, records requests, and validates each structured response", async () => {
        const response: ModelResponse = {
            provider: "scripted",
            model: "deterministic",
            content: '{"score":1}'
        };
        const provider = new ScriptedProvider({ steps: [response] });

        await expect(provider.generate(structuredRequest)).resolves.toMatchObject({
            structured: { score: 1 }
        });
        expect(provider.requests).toEqual([structuredRequest]);
        await expect(provider.generate(structuredRequest)).rejects.toMatchObject({
            code: "invalid_request"
        });
    });

    it("retains invalid structured output as a normalized failure", async () => {
        const provider = new ScriptedProvider({
            steps: [
                {
                    provider: "scripted",
                    model: "deterministic",
                    content: '{"score":"high"}'
                }
            ]
        });

        await expect(provider.generate(structuredRequest)).rejects.toBeInstanceOf(
            InvalidProviderOutputError
        );
    });
});

describe("ProviderRegistry", () => {
    it("creates registered providers lazily and caches the instance", () => {
        const provider = new ScriptedProvider({ steps: [] });
        const factory = vi.fn(() => provider);
        const registry = new ProviderRegistry().registerFactory("scripted", factory);

        expect(registry.ids()).toEqual(["scripted"]);
        expect(factory).not.toHaveBeenCalled();
        expect(registry.get("scripted")).toBe(provider);
        expect(registry.get("scripted")).toBe(provider);
        expect(factory).toHaveBeenCalledOnce();
    });

    it("normalizes missing and duplicate provider failures", () => {
        const registry = new ProviderRegistry().register(
            new ScriptedProvider({ id: "one", steps: [] })
        );

        expect(() => registry.register(new ScriptedProvider({ id: "one", steps: [] }))).toThrow(
            ProviderError
        );
        expect(() => registry.get("missing")).toThrowError(
            expect.objectContaining({ code: "capability_missing" })
        );
    });
});

function openAIResponse(content: string): Record<string, unknown> {
    return {
        id: "resp_1",
        object: "response",
        created_at: 1,
        completed_at: 2,
        status: "completed",
        model: "gpt-test",
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        output: [
            {
                id: "message_1",
                type: "message",
                status: "completed",
                role: "assistant",
                content: [
                    {
                        type: "output_text",
                        text: content,
                        annotations: [],
                        logprobs: []
                    }
                ]
            }
        ],
        parallel_tool_calls: true,
        temperature: 1,
        tool_choice: "auto",
        tools: [],
        top_p: 1,
        usage: {
            input_tokens: 12,
            input_tokens_details: { cached_tokens: 0 },
            output_tokens: 4,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 16
        }
    };
}
