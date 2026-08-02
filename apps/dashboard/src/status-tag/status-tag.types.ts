import type { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import type { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import type { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "#src/design-system/badge";

/** Every lifecycle status the dashboard renders as a status pill. */
export type TaggedStatus = InternalTaskStatus | ClaimStatus | ExperimentStatus | CapabilityStatus;

/** The badge looks the design system offers, with the implicit default excluded. */
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
