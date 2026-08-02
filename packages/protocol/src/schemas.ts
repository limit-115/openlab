import { z } from "zod";

export const IdentifierSchema = z.string().trim().min(1).max(200);

export const TaskInputSchema = z.object({
    id: IdentifierSchema.optional(),
    goal: z.string().trim().min(1),
    context: z.array(z.string()).default([]),
    success_criteria: z.array(z.string()).default([])
});

export const LabStateSchema = z.enum(["RUNNING", "HIBERNATING", "COMPLETED", "STOPPED", "FAILED"]);

export const AgentRoleSchema = z.enum(["director", "researcher", "critic", "verifier"]);

export const ClaimStatusSchema = z.enum([
    "proposed",
    "testing",
    "supported",
    "refuted",
    "reproduced"
]);

export const ClaimSchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    statement: z.string().trim().min(1),
    status: ClaimStatusSchema,
    assumption_ids: z.array(IdentifierSchema).default([]),
    supporting_evidence_ids: z.array(IdentifierSchema).default([]),
    contradicting_evidence_ids: z.array(IdentifierSchema).default([]),
    stale: z.boolean().default(false),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
});

export const EvidenceKindSchema = z.enum([
    "experiment",
    "source",
    "artifact",
    "counterexample",
    "verifier_result"
]);

export const EvidenceSchema = z.object({
    id: IdentifierSchema,
    kind: EvidenceKindSchema,
    claim_id: IdentifierSchema,
    run_id: IdentifierSchema.optional(),
    artifact_path: z.string().optional(),
    artifact_hash: z.string().optional(),
    summary: z.string().trim().min(1),
    supports: z.boolean(),
    independent: z.boolean().default(false),
    created_at: z.string().datetime()
});

export const InternalTaskStatusSchema = z.enum([
    "queued",
    "leased",
    "running",
    "succeeded",
    "failed",
    "cancelled"
]);

export const InternalTaskSchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    objective: z.string().trim().min(1),
    context_refs: z.array(z.string()).default([]),
    status: InternalTaskStatusSchema.default("queued"),
    attempt: z.number().int().positive().default(1),
    role: AgentRoleSchema
});

export const ExperimentStatusSchema = z.enum([
    "planned",
    "running",
    "succeeded",
    "failed",
    "timed_out",
    "cancelled"
]);

export const ExperimentSchema = z.object({
    id: IdentifierSchema,
    task_id: IdentifierSchema,
    branch_id: IdentifierSchema,
    hypothesis: z.string().trim().min(1),
    evaluator: z.string().trim().min(1),
    command: z.string().trim().min(1),
    cwd: z.string(),
    status: ExperimentStatusSchema,
    exit_code: z.number().int().nullable().optional(),
    started_at: z.string().datetime().optional(),
    finished_at: z.string().datetime().optional(),
    output_path: z.string().optional(),
    output_hash: z.string().optional()
});

export const CapabilityRequestSchema = z.object({
    id: IdentifierSchema,
    type: z.literal("capability_request"),
    need: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    provisioning_hint: z.string().trim().min(1),
    status: z.enum(["open", "provided", "obsolete"]).default("open"),
    created_at: z.string().datetime()
});

export const LabEventSchema = z.object({
    id: IdentifierSchema,
    lab_id: IdentifierSchema,
    type: IdentifierSchema,
    occurred_at: z.string().datetime(),
    payload: z.record(z.string(), z.unknown())
});

export const ModelMessageSchema = z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.string(),
    name: z.string().optional(),
    tool_call_id: z.string().optional()
});

export const ModelRequestSchema = z.object({
    messages: z.array(ModelMessageSchema).min(1),
    response_schema: z.record(z.string(), z.unknown()).optional(),
    tools: z.array(z.record(z.string(), z.unknown())).default([]),
    temperature: z.number().min(0).max(2).optional(),
    abort_after_ms: z.number().int().positive().optional()
});

export const ModelResponseSchema = z.object({
    provider: z.string(),
    model: z.string(),
    content: z.string(),
    structured: z.unknown().optional(),
    usage: z
        .object({
            input_tokens: z.number().int().nonnegative(),
            output_tokens: z.number().int().nonnegative()
        })
        .optional()
});

export type TaskInput = z.infer<typeof TaskInputSchema>;
export type LabState = z.infer<typeof LabStateSchema>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InternalTask = z.infer<typeof InternalTaskSchema>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export type CapabilityRequest = z.infer<typeof CapabilityRequestSchema>;
export type LabEvent = z.infer<typeof LabEventSchema>;
export type ModelRequest = z.infer<typeof ModelRequestSchema>;
export type ModelResponse = z.infer<typeof ModelResponseSchema>;
