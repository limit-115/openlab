import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { buttonVariants } from "#src/design-system/button";
import type { InvestigationControlMessage } from "#src/investigation-control/investigation-control.i18n";

/** What the operator is asked before a control that cannot be walked back runs. */
export interface InvestigationControlConfirmation {
    title: InvestigationControlMessage;
    consequence: InvestigationControlMessage;
    confirmLabel: InvestigationControlMessage;
}

/** A control is named out of the catalogue, so what stands here is keys rather than words. */
export interface InvestigationControlPresentation {
    label: InvestigationControlMessage;
    /** Replaces the label while the daemon is applying the transition. */
    pendingLabel: InvestigationControlMessage;
    icon: LucideIcon;
    tone: VariantProps<typeof buttonVariants>["variant"];
    /** Carried only by a control that ends the run for good. */
    confirmation?: InvestigationControlConfirmation;
}
