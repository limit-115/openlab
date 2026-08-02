import { CapabilityResourceReferenceSchema } from "@lab/protocol/capabilities/capability-resource-reference.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import {
    PROVIDE_CAPABILITY_LABEL,
    PROVIDING_CAPABILITY_LABEL,
    PROVISION_FORM,
    PROVISION_FORM_FAILURE,
    PROVISION_FORM_FIELD,
    PROVISION_FORM_LABEL,
    PROVISION_FORM_ROW,
    RESOURCE_REFERENCE_LABEL,
    RESOURCE_REFERENCE_PLACEHOLDER
} from "#src/capabilities/capability-provision.const";
import { provideCapability } from "#src/capabilities/capability-provision-request";
import { Button } from "#src/design-system/button";
import { Input } from "#src/design-system/input";
import { Spinner } from "#src/design-system/spinner";
import { statusQueryKey } from "#src/live-status/status-client";

interface CapabilityProvisionFormProps {
    requestId: string;
}

/**
 * Hands a resource to an open capability request. The reference is held to the protocol schema here
 * so a pasted credential is caught in the browser instead of travelling to the daemon.
 */
export function CapabilityProvisionForm({ requestId }: CapabilityProvisionFormProps) {
    const queryClient = useQueryClient();
    const fieldId = useId();
    const [resourceReference, setResourceReference] = useState("");
    const [rejection, setRejection] = useState<string | undefined>(undefined);
    const provision = useMutation({
        mutationFn: provideCapability,
        onSuccess: () => {
            setResourceReference("");
            void queryClient.invalidateQueries({ queryKey: statusQueryKey });
        }
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const parsed = CapabilityResourceReferenceSchema.safeParse(resourceReference);
        if (!parsed.success) {
            setRejection(parsed.error.issues[0]?.message);
            return;
        }
        setRejection(undefined);
        provision.mutate({ id: requestId, resourceReference: parsed.data });
    }

    const failure = rejection ?? provision.error?.message;

    return (
        <form className={PROVISION_FORM} onSubmit={submit} noValidate>
            <div className={PROVISION_FORM_ROW}>
                <div className={PROVISION_FORM_FIELD}>
                    <label className={PROVISION_FORM_LABEL} htmlFor={fieldId}>
                        {RESOURCE_REFERENCE_LABEL}
                    </label>
                    <Input
                        id={fieldId}
                        value={resourceReference}
                        placeholder={RESOURCE_REFERENCE_PLACEHOLDER}
                        aria-invalid={failure !== undefined}
                        onChange={(event) => setResourceReference(event.target.value)}
                    />
                </div>
                <Button type="submit" size="sm" disabled={provision.isPending}>
                    {provision.isPending ? <Spinner aria-hidden="true" /> : null}
                    {provision.isPending ? PROVIDING_CAPABILITY_LABEL : PROVIDE_CAPABILITY_LABEL}
                </Button>
            </div>
            {failure === undefined ? null : (
                <p role="alert" className={PROVISION_FORM_FAILURE}>
                    {failure}
                </p>
            )}
        </form>
    );
}
