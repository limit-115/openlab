import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { buttonVariants } from "#src/design-system/button";

/** What the operator is asked before a control that cannot be walked back runs. */
export interface LabControlConfirmation {
    title: string;
    consequence: string;
    confirmLabel: string;
}

export interface LabControlPresentation {
    label: string;
    /** Replaces the label while the daemon is applying the transition. */
    pendingLabel: string;
    icon: LucideIcon;
    tone: VariantProps<typeof buttonVariants>["variant"];
    /** Carried only by a control that ends the run for good. */
    confirmation?: LabControlConfirmation;
}
