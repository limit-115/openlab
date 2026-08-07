import type { CliHarnessOptions } from "#src/cli-agent-harness/cli-agent-harness.types";
import type { ResolveZaiCodingPlan } from "#src/glm-cli/zai-coding-plan.types";

export interface GlmHarnessOptions extends CliHarnessOptions {
    readonly resolveCodingPlan?: ResolveZaiCodingPlan;
}
