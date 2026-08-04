import { describe, expect, it } from "vitest";
import { TaskInputSchema } from "#src/research-task/task-input.schema";

describe("TaskInputSchema", () => {
    it("accepts a goal and supplies optional collection defaults", () => {
        expect(TaskInputSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: []
        });
    });

    it("rejects an empty goal", () => {
        expect(() => TaskInputSchema.parse({ goal: "  " })).toThrow();
    });
});
