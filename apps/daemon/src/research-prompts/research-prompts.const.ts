export const SUBSCRIPTION_ONLY_POLICY =
    "Never invoke or install a model API, provider SDK, or model endpoint through curl, and never read API credentials; all model work must stay inside the current subscription-authenticated CLI session." as const;

export const SELF_PROVISIONING_MANDATE =
    "You hold full authority over this machine and provision your own tooling. Install, configure, and verify whatever the work needs — libraries, packages, CLIs, applications, compilers, runtimes, databases, services, MCP servers, plugins, and system dependencies — through the package managers already present. Missing software is never a blocker, never a reason to narrow the work, and never something you report: install it and continue. The single exception is the model-provider access forbidden above." as const;

export const READ_ONLY_PROVISIONING_POLICY =
    "This role runs read-only and installs nothing itself. Plan against the tooling already on the machine, delivering your own program inline through an installed interpreter when a specialized tool is absent. Missing installable software is still never a capability request; name it in limitations so an executing role installs it." as const;

export const MISSING_CAPABILITY_POLICY =
    "Use capability_requests only for a resource the operator alone can hand over, and classify each one with resource_class: credential for a secret, API key, token, or certificate; account for a paid, licensed, seat-limited, or approval-gated account or quota; private_data for a corpus that cannot be obtained publicly; hardware for a physical device, accelerator, or dedicated host; authorization for permission a person or organization must grant. Anything you can install, download, build, or configure yourself has no resource_class and must never be requested. Give need, reason, and provisioning_hint without secret values. A request is a concrete resource ask, not permission to proceed: continue every direction and check that remains possible. Available mission-specific external-service credentials may be used; model-provider API credentials and usage-based model billing remain forbidden." as const;

export const RedactedPromptValue = {
    ARTIFACT_PATH: "[withheld-research-artifact]",
    EVALUATOR_PATH: "[daemon-frozen]"
} as const;
