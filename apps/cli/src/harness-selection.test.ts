import { HarnessKinds } from "@lab/harness/agent-harness.const";
import { InvalidArgumentError } from "commander";
import { describe, expect, it } from "vitest";
import { parseHarnessKinds } from "#src/harness-selection";

describe("parseHarnessKinds", () => {
    it("keeps the written order, because the roster order is the rotation", () => {
        expect(parseHarnessKinds(`${HarnessKinds.GLM},${HarnessKinds.CODEX}`, undefined)).toEqual([
            HarnessKinds.GLM,
            HarnessKinds.CODEX
        ]);
    });

    it("appends when the flag is repeated instead of dropping the earlier roster", () => {
        expect(parseHarnessKinds(HarnessKinds.CODEX, [HarnessKinds.GLM])).toEqual([
            HarnessKinds.GLM,
            HarnessKinds.CODEX
        ]);
    });

    it("rejects a harness the lab cannot build rather than silently narrowing the roster", () => {
        expect(() => parseHarnessKinds("gpt", undefined)).toThrow(InvalidArgumentError);
    });

    it("rejects a repeated harness, which would double its share of the rotation", () => {
        expect(() => parseHarnessKinds(HarnessKinds.GLM, [HarnessKinds.GLM])).toThrow(
            InvalidArgumentError
        );
    });

    it("rejects a roster that names nothing", () => {
        expect(() => parseHarnessKinds(" , ", undefined)).toThrow(InvalidArgumentError);
    });
});
