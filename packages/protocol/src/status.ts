import { z } from "zod";
import { AgentStatus, BranchStatus } from "#src/constants";
import {
    AgentRoleSchema,
    CapabilityRequestSchema,
    CapabilityResourceReferenceSchema,
    ClaimSchema,
    ExperimentSchema,
    IdentifierSchema,
    InternalTaskSchema,
    LabEventSchema,
    LabStateSchema
} from "#src/schemas";

export const BranchSummarySchema = z.object({
    id: IdentifierSchema,
    title: z.string().min(1),
    approach: z.string().min(1),
    status: z.enum(BranchStatus),
    progress: z.string().default("")
});

export const AgentSummarySchema = z.object({
    id: IdentifierSchema,
    branch_id: IdentifierSchema,
    role: AgentRoleSchema,
    status: z.enum(AgentStatus),
    current_task_id: IdentifierSchema.optional()
});

export const FrontierSnapshotSchema = z.object({
    known: z.array(z.string()).default([]),
    open_questions: z.array(z.string()).default([]),
    blockers: z.array(z.string()).default([]),
    next_experiments: z.array(z.string()).default([]),
    updated_at: z.iso.datetime()
});

export const ResultSummarySchema = z.object({
    summary: z.string(),
    report_path: z.string().optional(),
    result_path: z.string().optional(),
    limitations: z.array(z.string()).default([])
});

export const StatusSnapshotSchema = z.object({
    lab: z.object({
        id: IdentifierSchema,
        state: LabStateSchema,
        goal: z.string().min(1),
        started_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        uptime_ms: z.number().nonnegative(),
        reason: z.string().optional()
    }),
    frontier: FrontierSnapshotSchema,
    branches: z.array(BranchSummarySchema).default([]),
    agents: z.array(AgentSummarySchema).default([]),
    tasks: z.array(InternalTaskSchema).default([]),
    claims: z.array(ClaimSchema).default([]),
    experiments: z.array(ExperimentSchema).default([]),
    capability_requests: z.array(CapabilityRequestSchema).default([]),
    recent_events: z.array(LabEventSchema).default([]),
    result: ResultSummarySchema.optional()
});

export const ProvideCapabilitySchema = z.object({
    resource_reference: CapabilityResourceReferenceSchema
});

export type BranchSummary = z.infer<typeof BranchSummarySchema>;
export type AgentSummary = z.infer<typeof AgentSummarySchema>;
export type FrontierSnapshot = z.infer<typeof FrontierSnapshotSchema>;
export type ResultSummary = z.infer<typeof ResultSummarySchema>;
export type StatusSnapshot = z.infer<typeof StatusSnapshotSchema>;
export type ProvideCapability = z.infer<typeof ProvideCapabilitySchema>;
