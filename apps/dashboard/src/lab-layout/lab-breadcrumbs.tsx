import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { Link, useLocation } from "react-router";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "#src/design-system/breadcrumb";
import {
    fetchInvestigationRoster,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";
import { labTrail } from "#src/lab-layout/lab-trail";

/**
 * The path to the open page. It names an investigation by its goal, which it reads off the roster
 * the sidebar already holds, and falls back to the identifier until that roster arrives.
 */
export function LabBreadcrumbs() {
    const { pathname } = useLocation();
    const roster = useQuery({
        queryKey: investigationRosterQueryKey,
        queryFn: ({ signal }) => fetchInvestigationRoster(signal),
        retry: 2,
        staleTime: 5_000
    });

    const trail = labTrail(pathname, roster.data ?? []);

    if (trail.length === 0) {
        return null;
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {trail.map((step, index) => (
                    <Fragment key={step.label}>
                        {index > 0 ? <BreadcrumbSeparator /> : null}
                        <BreadcrumbItem>
                            {step.route === undefined ? (
                                <BreadcrumbPage>{step.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link to={step.route}>{step.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
