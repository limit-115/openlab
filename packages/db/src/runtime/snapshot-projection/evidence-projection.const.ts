import {
    EvidenceOrigin,
    type EvidenceOrigin as EvidenceOriginValue
} from "@lab/core/claims/evidence-origin.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";

export const UnboundEvidenceOrigin = {
    [EvidenceKind.EXPERIMENT]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.ARTIFACT]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.COUNTEREXAMPLE]: EvidenceOrigin.MODEL_JUDGEMENT,
    [EvidenceKind.VERIFIER_RESULT]: EvidenceOrigin.MODEL_JUDGEMENT
} as const satisfies Record<Evidence["kind"], EvidenceOriginValue>;

export const EvidenceIntegrity = {
    SHA256_PATTERN: /^[a-f0-9]{64}$/u
} as const;
