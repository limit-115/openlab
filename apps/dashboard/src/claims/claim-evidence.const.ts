import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";

export const EVIDENCE_LIST = "grid list-none gap-4 border-l-2 pl-4" as const;

export const EVIDENCE_ENTRY =
    "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2" as const;

export const EVIDENCE_MARK = "text-sm leading-6 font-semibold" as const;

/** Whether a record argues for the claim or against it, which is the first thing to read. */
export const EVIDENCE_MARK_TONE = {
    supporting: "text-primary",
    contradicting: "text-destructive"
} as const;

export const EVIDENCE_BODY = "flex min-w-0 flex-col gap-2" as const;

export const EVIDENCE_SUMMARY = "text-sm leading-relaxed break-words" as const;

export const EVIDENCE_TAGS = "flex flex-wrap items-center gap-2" as const;

export const EVIDENCE_RUN = "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" as const;

/** Commands, paths and hashes are values an operator copies, so they wrap instead of clipping. */
export const EVIDENCE_COMMAND =
    "rounded-xl bg-muted/50 px-3 py-2 font-mono text-sm break-all" as const;

export const EVIDENCE_ARTIFACT = "text-sm break-all text-muted-foreground" as const;

export const EVIDENCE_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;

export const EVIDENCE_MISSING = "text-sm break-words text-muted-foreground" as const;

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
    [EvidenceKind.EXPERIMENT]: "Experiment",
    [EvidenceKind.SOURCE]: "Source",
    [EvidenceKind.ARTIFACT]: "Artifact",
    [EvidenceKind.COUNTEREXAMPLE]: "Counterexample",
    [EvidenceKind.VERIFIER_RESULT]: "Verifier result"
};

/**
 * Reproduction by somebody who did not produce the result is the whole point of the lab, so
 * evidence that carries it says so rather than leaving it to the kind alone.
 */
export const INDEPENDENT_LABEL = "Independent" as const;

export const NO_EVIDENCE = "No evidence has been recorded for this claim yet." as const;

export const EVIDENCE_LOADING = "Reading the evidence" as const;
