import { describe, expect, it } from "vitest";
import { investigationView, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { labTrail } from "#src/lab-layout/lab-trail";
import { rosterFixture } from "#src/test-support/roster-fixture";

const [alpha] = rosterFixture;
const alphaId = alpha?.id ?? "missing";
const alphaGoal = alpha?.goal ?? "missing";

describe("labTrail", () => {
    it("leaves the operator nowhere to click while they are already there", () => {
        expect(labTrail(LabRoute.ROSTER, rosterFixture)).toEqual([{ label: "Investigations" }]);
    });

    it("keeps settings off the roster's trail, because it is not one of its pages", () => {
        expect(labTrail(LabRoute.SETTINGS, rosterFixture)).toEqual([{ label: "Settings" }]);
    });

    it("names an open investigation by its goal and points back at the roster", () => {
        expect(labTrail(investigationView(alphaId), rosterFixture)).toEqual([
            { label: "Investigations", route: LabRoute.ROSTER },
            { label: alphaGoal }
        ]);
    });

    it("steps through the investigation to reach one of its views", () => {
        expect(labTrail(`${investigationView(alphaId)}/team`, rosterFixture)).toEqual([
            { label: "Investigations", route: LabRoute.ROSTER },
            { label: alphaGoal, route: investigationView(alphaId) },
            { label: "Team" }
        ]);
    });

    it("falls back to the identifier for an investigation the roster has not delivered yet", () => {
        expect(labTrail(investigationView(alphaId), [])).toEqual([
            { label: "Investigations", route: LabRoute.ROSTER },
            { label: alphaId }
        ]);
    });

    it("says nothing rather than guessing at an address the lab does not serve", () => {
        expect(labTrail("/nowhere", rosterFixture)).toEqual([]);
    });
});
