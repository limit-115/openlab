export const RESOURCE_REFERENCE_LABEL = "Resource reference" as const;

export const RESOURCE_REFERENCE_PLACEHOLDER = "dataset://host/name" as const;

export const PROVIDE_CAPABILITY_LABEL = "Provide" as const;

export const PROVIDING_CAPABILITY_LABEL = "Providing" as const;

/** Shown when the daemon is gone, which reads nothing like a refusal the operator can act on. */
export const CAPABILITY_UNREACHABLE = "The lab daemon did not answer." as const;

export const PROVISION_FORM = "mt-2 grid gap-2 rounded-xl bg-muted/50 p-3" as const;

export const PROVISION_FORM_LABEL = "text-sm font-medium text-muted-foreground" as const;

export const PROVISION_FORM_ROW = "flex flex-wrap items-end gap-2" as const;

export const PROVISION_FORM_FIELD = "grid min-w-60 flex-1 gap-1.5" as const;

export const PROVISION_FORM_FAILURE = "text-sm text-destructive" as const;
