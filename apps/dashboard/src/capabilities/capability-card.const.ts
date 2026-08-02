import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";

export const CAPABILITY_ICON = "size-9 rounded-xl border bg-muted text-muted-foreground" as const;

export const CAPABILITY_NEED = "text-base" as const;

export const CAPABILITY_RESOURCE_CLASS_LABEL: Record<CapabilityResourceClass, string> = {
    [CapabilityResourceClass.CREDENTIAL]: "Operator credential",
    [CapabilityResourceClass.ACCOUNT]: "Operator account",
    [CapabilityResourceClass.PRIVATE_DATA]: "Private data",
    [CapabilityResourceClass.HARDWARE]: "Hardware",
    [CapabilityResourceClass.AUTHORIZATION]: "Authorization"
};

export const PROVISIONING_HINT = "mt-2 grid gap-2 rounded-xl bg-muted/50 p-3" as const;

export const PROVISIONING_HINT_HEADER = "flex items-center justify-between gap-2" as const;

export const PROVISIONING_HINT_LABEL = "text-sm font-medium text-muted-foreground" as const;

export const PROVISIONING_HINT_COMMAND = "font-mono text-sm break-all select-all" as const;

export const PROVISIONING_HINT_NOTE = "text-sm leading-relaxed text-muted-foreground" as const;

export const CAPABILITY_FOOTER = "justify-start text-sm text-muted-foreground" as const;

/** What the copy button on a provisioning command announces to the operator. */
export const COPY_PROVISIONING_COMMAND_LABEL = "Copy the provisioning command" as const;
