import { z } from "zod";
import type { ProviderToolDefinition } from "#src/types";

const ToolDefinitionSchema = z.strictObject({
    name: z.string().trim().min(1).max(128),
    description: z.string().trim().min(1).optional(),
    input_schema: z.record(z.string(), z.unknown())
});

export function parseToolDefinitions(
    tools: readonly Readonly<Record<string, unknown>>[]
): ProviderToolDefinition[] {
    return tools.map((tool) => {
        const parsed = ToolDefinitionSchema.parse(tool);
        return {
            name: parsed.name,
            input_schema: parsed.input_schema,
            ...(parsed.description === undefined ? {} : { description: parsed.description })
        };
    });
}
