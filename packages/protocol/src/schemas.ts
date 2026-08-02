import { z } from "zod";
import {
    AgentRole,
    CapabilityRequestType,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
    InternalTaskStatus,
    LabState
} from "#src/constants";

export const IdentifierSchema = z.string().trim().min(1).max(200);

export const TaskInputSchema = z.object({
    id: IdentifierSchema.optional(),
    goal: z.string().trim().min(1),
    context: z.array(z.string()).default([]),
    success_criteria: z.array(z.string()).default([])
});

export const LabStateSchema = z.enum(LabState);

export const AgentRoleSchema = z.enum(AgentRole);

export const ClaimStatusSchema = z.enum(ClaimStatus);

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

export const EvidenceKindSchema = z.enum(EvidenceKind);

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

export const InternalTaskStatusSchema = z.enum(InternalTaskStatus);

export const InternalTaskSchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    objective: z.string().trim().min(1),
    context_refs: z.array(z.string()).default([]),
    status: InternalTaskStatusSchema.default(InternalTaskStatus.QUEUED),
    attempt: z.number().int().positive().default(1),
    role: AgentRoleSchema
});

export const ExperimentStatusSchema = z.enum(ExperimentStatus);

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

export const CapabilityRequestSchema = z
    .object({
        id: IdentifierSchema,
        type: z.literal(CapabilityRequestType.CAPABILITY_REQUEST),
        need: z.string().trim().min(1),
        reason: z.string().trim().min(1),
        provisioning_hint: z.string().trim().min(1),
        status: z.enum(CapabilityStatus).default(CapabilityStatus.OPEN),
        resource_reference: z.string().trim().min(1).optional(),
        provided_at: z.string().datetime().optional(),
        created_at: z.string().datetime()
    })
    .refine(
        (request) =>
            request.status !== CapabilityStatus.PROVIDED ||
            (request.resource_reference !== undefined && request.provided_at !== undefined),
        {
            message: "A provided capability requires its resource reference and timestamp"
        }
    );

export const LabEventSchema = z.object({
    id: IdentifierSchema,
    lab_id: IdentifierSchema,
    type: z.enum(EventType),
    occurred_at: z.string().datetime(),
    payload: z.record(z.string(), z.unknown())
});

export type TaskInput = z.infer<typeof TaskInputSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type InternalTask = z.infer<typeof InternalTaskSchema>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export type CapabilityRequest = z.infer<typeof CapabilityRequestSchema>;
export type LabEvent = z.infer<typeof LabEventSchema>;
