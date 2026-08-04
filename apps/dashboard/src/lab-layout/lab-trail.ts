import type { InvestigationSummary } from "@lab/protocol/investigation-status/investigation-summary.types";
import { matchPath } from "react-router";
import { INVESTIGATION_ROUTE, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { LAB_SETTINGS, LAB_VIEWS } from "#src/lab-layout/lab-layout.const";

/** One step of the trail. The step the operator is standing on has nowhere to go, so it has no route. */
export interface TrailStep {
    label: string;
    route?: string;
}

const ROSTER_STEP = { label: LAB_VIEWS[0].label, route: LabRoute.ROSTER } as const;

/**
 * The way to the open page, read off its address. An address the lab does not recognise yields
 * nothing, because a trail that cannot say where it leads is worse than no trail at all.
 */
export function labTrail(pathname: string, roster: InvestigationSummary[]): TrailStep[] {
    const investigationId = matchPath(`${INVESTIGATION_ROUTE}/*`, pathname)?.params.id;

    if (investigationId !== undefined) {
        const goal = roster.find((entry) => entry.id === investigationId)?.goal ?? investigationId;
        return [ROSTER_STEP, { label: goal }];
    }
    if (pathname === LabRoute.SETTINGS) {
        return [{ label: LAB_SETTINGS.label }];
    }
    if (pathname === LabRoute.ROSTER) {
        return [{ label: ROSTER_STEP.label }];
    }
    return [];
}
