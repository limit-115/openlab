export const DormantCapabilityPolicyDecision = {
    ALLOW: "allow",
    DENY: "deny"
} as const;
export type DormantCapabilityPolicyDecision =
    (typeof DormantCapabilityPolicyDecision)[keyof typeof DormantCapabilityPolicyDecision];

export const ProtectedLabComponent = {
    LAB_RUNTIME: "lab_runtime",
    ORCHESTRATOR: "orchestrator",
    HARNESS: "harness"
} as const;
export type ProtectedLabComponent =
    (typeof ProtectedLabComponent)[keyof typeof ProtectedLabComponent];

export const DormantCapabilityPolicyReason = {
    UNDIAGNOSED_CONTROL_PLANE_MUTATION:
        "Protected lab-control-plane changes require a recovered, diagnosed blocker for the same component"
} as const;

export const ProtectedLabComponentPattern: Readonly<
    Record<ProtectedLabComponent, readonly RegExp[]>
> = {
    [ProtectedLabComponent.LAB_RUNTIME]: [
        /\b(?:current|this)\s+(?:autonomous\s+)?research\s+lab\b/iu,
        /\b(?:current|this|autonomous)\s+research\s+lab(?:'s)?\s+(?:implementation|internals?|runtime|control plane)\b/iu,
        /\bresearch\s+lab\s+(?:daemon|implementation|internals?|runtime|control plane)\b/iu
    ],
    [ProtectedLabComponent.ORCHESTRATOR]: [
        /\b(?:lab|research|agent)\s+(?:task\s+)?orchestrat(?:or|ion)\b/iu,
        /\bresearch[- ]loop\b/iu,
        /\bdirector\s+(?:agent|stage|scheduler|prompt|policy)\b/iu
    ],
    [ProtectedLabComponent.HARNESS]: [
        /\b(?:lab|agent|model|codex|claude|subscription(?: cli)?)\s+(?:cli\s+)?harness(?:es)?\b/iu,
        /\bharness\s+(?:adapter|dispatch|implementation|policy|runner)\b/iu
    ]
};

export const MutationActionPattern =
    /\b(?:alter(?:ed|ing)?|chang(?:e|ed|ing)|edit(?:ed|ing)?|fix(?:ed|es|ing)?|modif(?:y|ied|ying)|mutat(?:e|ed|ing)|patch(?:ed|es|ing)?|rebuild(?:s|ing)?|reconfigur(?:e|ed|ing)|refactor(?:ed|ing)?|repair(?:ed|ing)?|replac(?:e|ed|ing)|rewrit(?:e|ing)|rewritten|upgrad(?:e|ed|ing))\b/iu;
export const DiagnosedFailurePattern =
    /\b(?:blocked|blocker|blocks?|broken|cannot|corrupt(?:ed|ion)?|crash(?:ed|es|ing)?|deadlock|defect|drops?|duplicates?|error|failed|failing|failure|fault|hangs?|incorrect|invalid|leaks?|loses?|misroutes?|prevents?|race condition|stuck|unable)\b/iu;
