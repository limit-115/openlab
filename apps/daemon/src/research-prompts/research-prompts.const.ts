export const SUBSCRIPTION_ONLY_POLICY =
    "Never invoke or install a model API, provider SDK, or model endpoint through curl, and never read API credentials; all model work must stay inside the current subscription-authenticated CLI session." as const;

export const MISSING_CAPABILITY_POLICY =
    "When a credential, tool, dataset, account, or infrastructure resource genuinely required for the mission is unavailable, report it in capability_requests with need, reason, and provisioning_hint, without including secret values. This is a concrete resource request, not permission to proceed. Continue every direction and check that remains possible. Available mission-specific external-service credentials may be used; model-provider API credentials and usage-based model billing remain forbidden." as const;

export const RedactedPromptValue = {
    ARTIFACT_PATH: "[withheld-research-artifact]",
    EVALUATOR_PATH: "[daemon-frozen]"
} as const;
