import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "#src/design-system/dialog";
import { SidebarMenuButton } from "#src/design-system/sidebar";
import {
    COMPOSER_DIALOG,
    NEW_INVESTIGATION_DESCRIPTION,
    NEW_INVESTIGATION_LABEL
} from "#src/investigation-roster/investigation-roster.const";
import {
    createInvestigation,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";
import { NewInvestigationForm } from "#src/investigation-roster/new-investigation-form";

/**
 * The lab's way in. Composing a direction is a decision of its own, so it happens over the page
 * rather than in it, and the operator lands on the investigation the lab just opened.
 */
export function NewInvestigationDialog() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [composing, setComposing] = useState(false);

    const start = useMutation({
        mutationFn: createInvestigation,
        onSuccess: async (snapshot) => {
            setComposing(false);
            await queryClient.invalidateQueries({ queryKey: investigationRosterQueryKey });
            await navigate(investigationView(snapshot.investigation.id));
        }
    });

    function compose(open: boolean) {
        setComposing(open);
        if (!open) {
            start.reset();
        }
    }

    return (
        <Dialog open={composing} onOpenChange={compose}>
            <DialogTrigger asChild>
                <SidebarMenuButton>
                    <PlusIcon />
                    <span>{NEW_INVESTIGATION_LABEL}</span>
                </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className={COMPOSER_DIALOG}>
                <DialogHeader>
                    <DialogTitle>{NEW_INVESTIGATION_LABEL}</DialogTitle>
                    <DialogDescription>{NEW_INVESTIGATION_DESCRIPTION}</DialogDescription>
                </DialogHeader>
                <NewInvestigationForm
                    start={(investigation) => start.mutate(investigation)}
                    starting={start.isPending}
                    cancel={() => compose(false)}
                    {...(start.error === null ? {} : { failure: start.error.message })}
                />
            </DialogContent>
        </Dialog>
    );
}
