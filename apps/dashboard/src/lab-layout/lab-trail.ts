import type { InvestigationSummary } from "@nightlab/protocol/investigation-status/investigation-summary.types";
import { matchPath } from "react-router";
import { INVESTIGATION_ROUTE, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { LAB_SETTINGS, LAB_VIEWS, type LabPlace } from "#src/lab-layout/lab-layout.const";

/**
 * One step of the trail. It is either one of the lab's own places, which the interface has a word
 * for, or an investigation, which is named by the goal it was opened with and stays in the words
 * its author wrote. The step the operator is standing on has nowhere to go, so it has no route.
 */
export type TrailStep = { place: LabPlace; route?: string } | { goal: string };

const ROSTER_STEP = { place: LAB_VIEWS[0].place, route: LabRoute.ROSTER } as const;

/**
 * The way to the open page, read off its address. An address the lab does not recognise yields
 * nothing, because a trail that cannot say where it leads is worse than no trail at all.
 */
export function labTrail(pathname: string, roster: InvestigationSummary[]): TrailStep[] {
    const investigationId = matchPath(`${INVESTIGATION_ROUTE}/*`, pathname)?.params.id;

    if (investigationId !== undefined) {
        const goal = roster.find((entry) => entry.id === investigationId)?.goal ?? investigationId;
        return [ROSTER_STEP, { goal }];
    }
    if (pathname === LabRoute.SETTINGS) {
        return [{ place: LAB_SETTINGS.place }];
    }
    if (pathname === LabRoute.ROSTER) {
        return [{ place: ROSTER_STEP.place }];
    }
    return [];
}
