import type { LucideIcon } from "lucide-react";
import type { InvestigationControlTone } from "#src/investigation-control/investigation-control.const";

/** What the operator is asked before a control that cannot be walked back runs. */
export interface InvestigationControlConfirmation {
    title: string;
    consequence: string;
    confirmLabel: string;
}

export interface InvestigationControlPresentation {
    label: string;
    /** Replaces the label while the daemon is applying the transition. */
    pendingLabel: string;
    icon: LucideIcon;
    tone: InvestigationControlTone;
    /** Carried only by a control that ends the run for good. */
    confirmation?: InvestigationControlConfirmation;
}
