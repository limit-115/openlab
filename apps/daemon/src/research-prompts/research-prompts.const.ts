import { EVALUATOR_VERDICT } from "#src/research-contract/research-contract.const";

export const SELF_PROVISIONING_MANDATE =
    "You hold full authority over this machine and provision your own tooling. Install, configure, and verify whatever the work needs — libraries, packages, CLIs, applications, compilers, runtimes, databases, services, MCP servers, plugins, and system dependencies — through the package managers already present. Missing software is never a blocker, never a reason to narrow the work, and never something you report: install it and continue." as const;

export const AUTONOMOUS_EXECUTION_MANDATE =
    "You carry this work out yourself. Write programs, run commands, build prototypes, measure, and iterate until the direction has been genuinely tested. Nothing about this role is planning theatre and nothing waits on another agent to execute for you. Choose the method the question deserves rather than the one that is easiest to report, and let a negative result stand as a result." as const;

export const MATERIAL_ARTIFACT_POLICY =
    "An artifact is a file your own execution wrote: a measurement, a captured output, a log, a dataset. Prose, JSON you typed yourself, and a summary of what you believe happened are not artifacts. The daemon copies every path you declare into storage you do not control, re-reads and hashes the copy, and judges that copy with a precommitted evaluator you can neither see nor run, so an artifact that merely asserts a conclusion fails against an evaluator that measures one. Put your artifacts wherever the work puts them and hand over the paths; a relative path is read from the current workspace." as const;

export const MISSING_CAPABILITY_POLICY =
    "Use capability_requests only for a resource the operator alone can hand over. Anything you can install, download, build, or stand up yourself must never be requested: provision it and continue. Every request carries need, reason, provisioning_hint, and self_provisioning_attempt — what you actually tried in order to obtain or reproduce the resource on your own, and where that attempt fell short. If you cannot describe a real attempt, you are not entitled to the request. Ask for the narrowest thing that unblocks you: never widen a need into a service you could run locally, and never bundle a self-provisionable alternative into the same request. Carry no secret values. A request is a concrete resource ask, not permission to proceed and not a question about method: continue every direction and check that remains possible. The operator replies in prose and may hand the resource over, refuse it, or send you back to your own hands; read that answer and act on it rather than waiting again. Available mission-specific external-service credentials may be used." as const;

export const EVALUATOR_VERDICT_CONTRACT =
    `The daemon runs the evaluator later, alone, and writes one JSON object to its stdin:

{
    "schema_version": 1,
    "target": { "kind": "...", "index": 0, "claim_id": "...", "statement_sha256": "<64 lowercase hex>" },
    "evaluator": { "sha256": "<64 lowercase hex>", "args": [], "success_contract": "..." },
    "artifacts": [{ "path": "...", "bytes": 0, "sha256": "<64 lowercase hex>" }],
    "input_binding_sha256": "<64 lowercase hex>"
}

The evaluator writes exactly one JSON object to stdout, with every field below present and named
exactly as written:

{
    "schema_version": 1,
    "verdict": "${EVALUATOR_VERDICT.SUPPORTS}",
    "target_statement_sha256": "<64 lowercase hex>",
    "input_binding_sha256": "<64 lowercase hex>",
    "artifact_sha256s": ["<64 lowercase hex>"],
    "success_contract": "...",
    "checks": [{ "name": "...", "passed": true, "observed": "...", "expected": "..." }],
    "summary": "..."
}

verdict is ${EVALUATOR_VERDICT.SUPPORTS}, ${EVALUATOR_VERDICT.CONTRADICTS}, or ${EVALUATOR_VERDICT.INCONCLUSIVE}. target_statement_sha256 echoes the input target.statement_sha256, input_binding_sha256 echoes the input input_binding_sha256, success_contract echoes the input evaluator.success_contract verbatim, and artifact_sha256s echoes every input artifacts[].sha256 in the order received, none added, none dropped, none reordered. The daemon recomputes all four and rejects a verdict that does not match, so read them out of the input instead of recomputing or inventing them. checks carries at least one real check, each with name, passed, observed, and expected; ${EVALUATOR_VERDICT.SUPPORTS} requires every check to have passed, and ${EVALUATOR_VERDICT.CONTRADICTS} requires at least one failed check. stdout carries that object and nothing else — no logging, no progress, no prose, no code fence — and diagnostics go to stderr.` as const;

export const RedactedPromptValue = {
    ARTIFACT_PATH: "[withheld-research-artifact]",
    EVALUATOR_PATH: "[daemon-frozen]"
} as const;
