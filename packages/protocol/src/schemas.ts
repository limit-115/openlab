import { z } from "zod";
import {
    AgentRole,
    CapabilityRequestType,
    CapabilityResourceScheme,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
    ExternalEffect,
    InternalTaskStatus,
    LabState,
    SourceClassification,
    SourceRetrievalMethod
} from "#src/constants";

export const IdentifierSchema = z.string().trim().min(1).max(200);

const CapabilityResourceReferenceLimit = {
    MAXIMUM_LENGTH: 2_048,
    LONG_OPAQUE_SEGMENT_LENGTH: 80
} as const;

const CapabilityFileReference = {
    LOCAL_HOST: "localhost",
    ROOT_PATH: "/"
} as const;

const CapabilityResourceSecretPattern = {
    OPENAI_KEY: /(?:^|[^\p{L}\p{N}])sk-[a-z\d_-]{12,}(?:$|[^\p{L}\p{N}])/iu,
    BEARER_TOKEN: /(?:^|[^\p{L}\p{N}])bearer(?:%20|\s)+[a-z\d._~+/=-]{8,}/iu,
    CREDENTIAL_ASSIGNMENT:
        /(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)(?:%20|\s)*(?:=|:)(?:%20|\s)*[^/?#&\s]{4,}/iu,
    JSON_WEB_TOKEN: /(?:^|[^a-z\d_-])eyj[a-z\d_-]{8,}\.[a-z\d_-]{8,}\.[a-z\d_-]{8,}/iu,
    AWS_ACCESS_KEY: /(?:^|[^A-Z\d])AKIA[A-Z\d]{16}(?:$|[^A-Z\d])/u,
    LONG_OPAQUE_SEGMENT: new RegExp(
        `(?:^|[/:])[a-z\\d+_=-]{${CapabilityResourceReferenceLimit.LONG_OPAQUE_SEGMENT_LENGTH},}(?=$|[/?#])`,
        "iu"
    )
} as const;

const CapabilityResourceReferenceError = {
    EMPTY: "Capability resource reference must not be empty",
    TOO_LONG: "Capability resource reference is too long",
    UNSAFE: "Capability resource must be an opaque dataset, toolchain, keychain, or file reference",
    SECRET: "Capability resource reference must never contain a credential payload"
} as const;

const capabilityResourceSchemes: ReadonlySet<string> = new Set(
    Object.values(CapabilityResourceScheme)
);

export const CapabilityResourceReferenceSchema = z
    .string()
    .trim()
    .min(1, CapabilityResourceReferenceError.EMPTY)
    .max(CapabilityResourceReferenceLimit.MAXIMUM_LENGTH, CapabilityResourceReferenceError.TOO_LONG)
    .superRefine((value, context) => {
        if (Object.values(CapabilityResourceSecretPattern).some((pattern) => pattern.test(value))) {
            context.addIssue({
                code: "custom",
                message: CapabilityResourceReferenceError.SECRET
            });
            return;
        }

        let reference: URL;
        try {
            reference = new URL(value);
        } catch {
            context.addIssue({
                code: "custom",
                message: CapabilityResourceReferenceError.UNSAFE
            });
            return;
        }

        const hasSafeScheme =
            capabilityResourceSchemes.has(reference.protocol) &&
            value.startsWith(`${reference.protocol}//`);
        const hasCredentialMaterial =
            reference.username.length > 0 ||
            reference.password.length > 0 ||
            reference.search.length > 0 ||
            reference.hash.length > 0;
        const hasSafeLocation =
            reference.protocol === CapabilityResourceScheme.FILE
                ? (reference.hostname.length === 0 ||
                      reference.hostname === CapabilityFileReference.LOCAL_HOST) &&
                  reference.pathname !== CapabilityFileReference.ROOT_PATH
                : reference.hostname.length > 0;

        if (!hasSafeScheme || hasCredentialMaterial || !hasSafeLocation) {
            context.addIssue({
                code: "custom",
                message: hasCredentialMaterial
                    ? CapabilityResourceReferenceError.SECRET
                    : CapabilityResourceReferenceError.UNSAFE
            });
        }
    });

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

export const SourceEvidenceMetadataSchema = z.object({
    requested_url: z.url(),
    final_url: z.url(),
    title: z.string().trim().min(1),
    claimed_classification: z.enum(SourceClassification),
    retrieval_method: z.literal(SourceRetrievalMethod.DAEMON_HTTP),
    http_status: z.number().int().min(200).max(299),
    fetched_at: z.string().datetime()
});

export const EvidenceSchema = z
    .object({
        id: IdentifierSchema,
        kind: EvidenceKindSchema,
        claim_id: IdentifierSchema,
        run_id: IdentifierSchema.optional(),
        artifact_path: z.string().optional(),
        artifact_hash: z.string().optional(),
        summary: z.string().trim().min(1),
        supports: z.boolean(),
        independent: z.boolean().default(false),
        source: SourceEvidenceMetadataSchema.optional(),
        created_at: z.string().datetime()
    })
    .superRefine((evidence, context) => {
        if (evidence.kind === EvidenceKind.SOURCE && evidence.source === undefined) {
            context.addIssue({
                code: "custom",
                path: ["source"],
                message: "Source evidence requires daemon retrieval metadata"
            });
        }
        if (evidence.kind === EvidenceKind.SOURCE && evidence.supports) {
            context.addIssue({
                code: "custom",
                path: ["supports"],
                message: "A citation cannot independently support a claim"
            });
        }
        if (evidence.kind !== EvidenceKind.SOURCE && evidence.source !== undefined) {
            context.addIssue({
                code: "custom",
                path: ["source"],
                message: "Only source evidence may include retrieval metadata"
            });
        }
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
    output_hash: z.string().optional(),
    external_effect: z.enum(ExternalEffect).optional(),
    reconciliation_key: z.string().trim().min(1).optional(),
    execution_fingerprint: z
        .string()
        .regex(/^[a-f0-9]{64}$/u)
        .optional()
});

export const CapabilityRequestSchema = z
    .object({
        id: IdentifierSchema,
        type: z.literal(CapabilityRequestType.CAPABILITY_REQUEST),
        need: z.string().trim().min(1),
        reason: z.string().trim().min(1),
        provisioning_hint: z.string().trim().min(1),
        status: z.enum(CapabilityStatus).default(CapabilityStatus.OPEN),
        resource_reference: CapabilityResourceReferenceSchema.optional(),
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
