import type { ResolveZaiCodingPlan } from "#src/glm-cli/zai-coding-plan.types";
import type { SubscriptionHarnessOptions } from "#src/subscription-cli-harness/subscription-cli-harness.types";

export interface GlmHarnessOptions extends SubscriptionHarnessOptions {
    readonly resolveCodingPlan?: ResolveZaiCodingPlan;
}
