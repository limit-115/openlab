import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { describe, expect, it } from "vitest";
import {
    assertEvaluatorUnchanged,
    freezeEvaluator
} from "#src/evaluator-integrity/frozen-evaluator";
import type {
    EvaluatorTarget,
    FrozenEvaluator
} from "#src/evaluator-integrity/frozen-evaluator.types";
import { RESEARCH_TARGET_KIND } from "#src/research-contract/research-contract.const";

const target = {
    kind: RESEARCH_TARGET_KIND.CLAIM,
    index: 0,
    claim: {
        id: "claim-1",
        branch_id: "branch-1",
        statement: "The candidate is faster",
        status: ClaimStatus.TESTING,
        assumption_ids: [],
        supporting_evidence_ids: [],
        contradicting_evidence_ids: [],
        stale: false,
        created_at: "2026-08-02T00:00:00.000Z",
        updated_at: "2026-08-02T00:00:00.000Z"
    }
} satisfies EvaluatorTarget;

const SAMPLE_EVALUATOR_SOURCE =
    "#!/usr/bin/env node\nprocess.stdin.resume();\nprocess.stdout.write('{}');\n";

async function freezeSampleEvaluator(): Promise<{
    frozen: FrozenEvaluator;
    evaluatorPath: string;
    source: string;
}> {
    const directory = await mkdtemp(path.join(tmpdir(), "lab-evaluator-author-"));
    const runDirectory = await mkdtemp(path.join(tmpdir(), "lab-evaluator-run-"));
    const evaluatorPath = path.join(directory, "evaluate");
    await writeFile(evaluatorPath, SAMPLE_EVALUATOR_SOURCE);
    await chmod(evaluatorPath, 0o755);
    const frozen = await freezeEvaluator(
        directory,
        runDirectory,
        {
            target_kind: RESEARCH_TARGET_KIND.CLAIM,
            target_index: 0,
            evaluator_path: evaluatorPath,
            args: ["--strict"],
            success_contract: "Validate the measured speedup"
        },
        target
    );
    return { frozen, evaluatorPath, source: SAMPLE_EVALUATOR_SOURCE };
}

describe("evaluator precommit", () => {
    it("keeps the precommitted evaluator when its author rewrites the file it wrote", async () => {
        const { frozen, evaluatorPath, source } = await freezeSampleEvaluator();

        await writeFile(evaluatorPath, "#!/usr/bin/env node\nprocess.exit(0);\n");

        await expect(assertEvaluatorUnchanged(frozen)).resolves.toBeUndefined();
        expect(frozen.file.startsWith(path.dirname(evaluatorPath))).toBe(false);
        await expect(readFile(frozen.file, "utf8")).resolves.toBe(source);
    });

    it("detects mutation of the frozen evaluator itself", async () => {
        const { frozen } = await freezeSampleEvaluator();

        await chmod(frozen.file, 0o700);
        await writeFile(frozen.file, "#!/usr/bin/env node\nthrow new Error('changed');\n");

        await expect(assertEvaluatorUnchanged(frozen)).rejects.toThrow("changed after precommit");
    });
});
