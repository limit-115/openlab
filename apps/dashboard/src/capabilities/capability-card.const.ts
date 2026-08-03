import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";

/**
 * A blocked direction is the one thing on this page that needs a person, so the request stands on
 * the page in its own right rather than as an entry inside a panel of entries.
 */
export const CAPABILITY_CARD = "flex flex-col gap-4 rounded-2xl border p-6" as const;

export const CAPABILITY_CARD_OPEN = "border-primary/50" as const;

export const CAPABILITY_HEADER = "flex flex-wrap items-start justify-between gap-3" as const;

/** How long the lab has been waiting, which is the cost of not having noticed the request. */
export const CAPABILITY_WAITING = "text-sm font-medium text-primary" as const;

export const CAPABILITY_SETTLED = "text-sm text-muted-foreground" as const;

export const CAPABILITY_NEED = "max-w-prose text-lg leading-snug font-medium text-balance" as const;

export const CAPABILITY_TAGS = "flex flex-wrap items-center gap-2" as const;

export const CAPABILITY_PAIRS = "grid gap-4 sm:grid-cols-2" as const;

export const CAPABILITY_PAIR_LABEL = "text-sm text-muted-foreground" as const;

export const CAPABILITY_PAIR_VALUE = "text-sm leading-relaxed break-words" as const;

export const CAPABILITY_RESOURCE_CLASS_LABEL: Record<CapabilityResourceClass, string> = {
    [CapabilityResourceClass.CREDENTIAL]: "Operator credential",
    [CapabilityResourceClass.ACCOUNT]: "Operator account",
    [CapabilityResourceClass.PRIVATE_DATA]: "Private data",
    [CapabilityResourceClass.HARDWARE]: "Hardware",
    [CapabilityResourceClass.AUTHORIZATION]: "Authorization"
};

export const PROVISIONING_HINT_HEADER = "flex items-center justify-between gap-2" as const;

export const PROVISIONING_HINT_COMMAND = "font-mono text-sm break-all select-all" as const;

/** What the copy button on a provisioning command announces to the operator. */
export const COPY_PROVISIONING_COMMAND_LABEL = "Copy the provisioning command" as const;

export const WHAT_THIS_UNBLOCKS = "What this unblocks" as const;

export const HOW_TO_PROVIDE = "How to provide it" as const;

export const PROVISION_VIA_CLI = "Or from the CLI" as const;
