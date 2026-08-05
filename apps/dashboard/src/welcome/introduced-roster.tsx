import { Navigate } from "react-router";
import { InvestigationRoster } from "#src/investigation-roster/investigation-roster";
import { WELCOME_ROUTE } from "#src/welcome/welcome.const";
import { hasBeenIntroduced } from "#src/welcome/welcome-introduction";

/**
 * What opening the lab shows: its investigations to somebody who knows what they are, and the
 * introduction to somebody who does not. Only this address is guarded, because it is the one the
 * lab opens itself at — anybody who typed an address of their own already knows where they are
 * going, and being sent somewhere else instead would be an interruption rather than a welcome.
 */
export function IntroducedRoster() {
    if (!hasBeenIntroduced()) {
        return <Navigate to={WELCOME_ROUTE} replace />;
    }

    return <InvestigationRoster />;
}
