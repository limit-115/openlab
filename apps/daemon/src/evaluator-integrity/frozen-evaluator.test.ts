import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ClaimStatus } from "@lab/protocol/constants";
import { describe, expect, it } from "vitest";
import {
    assertEvaluatorUnchanged,
    evaluatorSemanticIdentity,
    freezeEvaluator
} from "#src/evaluator-integrity/frozen-evaluator";
import type { EvaluatorTarget } from "#src/evaluator-integrity/frozen-evaluator.types";
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

describe("evaluator precommit", () => {
    it("rejects an executable outside the isolated workspace", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-evaluator-external-"));

        await expect(
            freezeEvaluator(
                directory,
                {
                    target_kind: RESEARCH_TARGET_KIND.CLAIM,
                    target_index: 0,
                    evaluator_path: "/usr/bin/true",
                    args: [],
                    success_contract: "Validate the measured speedup"
                },
                target
            )
        ).rejects.toThrow("escapes its isolated workspace");
    });

    it("rejects an empty always-success evaluator", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-evaluator-trivial-"));
        const evaluatorPath = path.join(directory, "evaluate");
        await writeFile(evaluatorPath, "#!/usr/bin/env node\nprocess.exit(0);\n");
        await chmod(evaluatorPath, 0o755);

        await expect(
            freezeEvaluator(
                directory,
                {
                    target_kind: RESEARCH_TARGET_KIND.CLAIM,
                    target_index: 0,
                    evaluator_path: evaluatorPath,
                    args: [],
                    success_contract: "Validate the measured speedup"
                },
                target
            )
        ).rejects.toThrow("Trivial always-success evaluator is forbidden");
    });

    it("detects evaluator mutation after a valid precommit", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "lab-evaluator-frozen-"));
        const evaluatorPath = path.join(directory, "evaluate");
        await writeFile(
            evaluatorPath,
            "#!/usr/bin/env node\nprocess.stdin.resume();\nprocess.stdout.write('{}');\n"
        );
        await chmod(evaluatorPath, 0o755);
        const frozen = await freezeEvaluator(
            directory,
            {
                target_kind: RESEARCH_TARGET_KIND.CLAIM,
                target_index: 0,
                evaluator_path: evaluatorPath,
                args: ["--strict"],
                success_contract: "Validate the measured speedup"
            },
            target
        );

        await writeFile(evaluatorPath, "#!/usr/bin/env node\nthrow new Error('changed');\n");

        await expect(assertEvaluatorUnchanged(directory, frozen)).rejects.toThrow(
            "changed after precommit"
        );
    });

    it("assigns one semantic identity to comment and whitespace-only variants", () => {
        const compact = `#!/usr/bin/env node
const value = 1;
process.stdout.write(String(value));
`;
        const cosmeticVariant = `#!/usr/bin/env node
// Cosmetic comment
const   value = 1; /* another comment */

process.stdout.write( String(value) );
`;

        expect(evaluatorSemanticIdentity(compact, ["--strict"], "A value must be reported")).toBe(
            evaluatorSemanticIdentity(cosmeticVariant, ["--strict"], "A value must be reported")
        );
    });
});
