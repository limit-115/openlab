import { describe, expect, it } from "vitest";
import { investigationAddress, LabRoute } from "#src/dashboard-routes/dashboard-routes.const";
import { LabPlace } from "#src/lab-layout/lab-layout.const";
import { labTrail } from "#src/lab-layout/lab-trail";
import { rosterFixture } from "#src/test-support/roster-fixture";

const [alpha] = rosterFixture;
const alphaId = alpha?.id ?? "missing";
const alphaGoal = alpha?.goal ?? "missing";

describe("labTrail", () => {
    it("leaves the operator nowhere to click while they are already there", () => {
        expect(labTrail(LabRoute.ROSTER, rosterFixture)).toEqual([{ place: LabPlace.ROSTER }]);
    });

    it("keeps settings off the roster's trail, because it is not one of its pages", () => {
        expect(labTrail(LabRoute.SETTINGS, rosterFixture)).toEqual([{ place: LabPlace.SETTINGS }]);
    });

    it("names an open investigation by its goal and points back at the roster", () => {
        expect(labTrail(investigationAddress(alphaId), rosterFixture)).toEqual([
            { place: LabPlace.ROSTER, route: LabRoute.ROSTER },
            { goal: alphaGoal }
        ]);
    });

    it("falls back to the identifier for an investigation the roster has not delivered yet", () => {
        expect(labTrail(investigationAddress(alphaId), [])).toEqual([
            { place: LabPlace.ROSTER, route: LabRoute.ROSTER },
            { goal: alphaId }
        ]);
    });

    it("says nothing rather than guessing at an address the lab does not serve", () => {
        expect(labTrail("/nowhere", rosterFixture)).toEqual([]);
    });
});
