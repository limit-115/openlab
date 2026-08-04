import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
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
import {
    TRAIL_ITEM,
    TRAIL_LIST,
    TRAIL_SEPARATOR,
    TRAIL_STEP
} from "#src/lab-layout/lab-layout.const";
import { LAB_LAYOUT_NAMESPACE } from "#src/lab-layout/lab-layout.i18n";
import { labTrail } from "#src/lab-layout/lab-trail";

/**
 * The path to the open page. It names an investigation by its goal, which it reads off the roster
 * the sidebar already holds, and falls back to the identifier until that roster arrives.
 */
export function LabBreadcrumbs() {
    const { t } = useTranslation(LAB_LAYOUT_NAMESPACE);
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
            <BreadcrumbList className={TRAIL_LIST}>
                {trail.map((step, index) => {
                    const label = "goal" in step ? step.goal : t(step.place);
                    const route = "goal" in step ? undefined : step.route;

                    return (
                        <Fragment key={label}>
                            {index > 0 ? <BreadcrumbSeparator className={TRAIL_SEPARATOR} /> : null}
                            <BreadcrumbItem className={TRAIL_ITEM}>
                                {route === undefined ? (
                                    <BreadcrumbPage className={TRAIL_STEP} title={label}>
                                        {label}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild className={TRAIL_STEP}>
                                        <Link to={route} title={label}>
                                            {label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
