import type { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import type { AssumptionStatus } from "@openlab/protocol/assumptions/assumption-status.const";
import type { CapabilityStatus } from "@openlab/protocol/capabilities/capability-request.const";
import type { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "#src/design-system/badge";

/** Every lifecycle status the dashboard renders as a status pill. */
export type TaggedStatus = AgentRunStatus | AssumptionStatus | FindingStatus | CapabilityStatus;

/** The badge looks the design system offers, with the implicit default excluded. */
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
