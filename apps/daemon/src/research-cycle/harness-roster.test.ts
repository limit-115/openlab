import { HarnessKinds } from "@lab/harness/agent-harness.const";
import { describe, expect, it } from "vitest";
import { createHarnesses } from "#src/research-cycle/harness-roster";
import { DEFAULT_HARNESS_KINDS } from "#src/research-cycle/harness-roster.const";

describe("createHarnesses", () => {
    it("keeps the roster order, because the order is the rotation stages walk", () => {
        expect(createHarnesses(DEFAULT_HARNESS_KINDS).map(({ kind }) => kind)).toEqual([
            HarnessKinds.CODEX,
            HarnessKinds.CLAUDE,
            HarnessKinds.GLM
        ]);
    });

    it("builds only what a pinned roster names, leaving nothing to rotate onto", () => {
        expect(createHarnesses([HarnessKinds.GLM]).map(({ kind }) => kind)).toEqual([
            HarnessKinds.GLM
        ]);
    });
});
