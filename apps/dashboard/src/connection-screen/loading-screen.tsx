import { FlaskConical } from "lucide-react";
import {
    CENTER_STATE,
    CENTER_STATE_MARK,
    CENTER_STATE_MARK_READY,
    CENTER_STATE_TEXT,
    CENTER_STATE_TITLE,
    FLOATING_MARK,
    LOADING_LINE
} from "#src/connection-screen/connection-screen.const";
import { EYEBROW } from "#src/panel/panel.const";

export function LoadingDashboard() {
    return (
        <main className={CENTER_STATE} aria-busy="true">
            <span className={`${CENTER_STATE_MARK} ${CENTER_STATE_MARK_READY}`}>
                <FlaskConical size={28} className={FLOATING_MARK} aria-hidden="true" />
            </span>
            <p className={EYEBROW}>Local research runtime</p>
            <h1 className={CENTER_STATE_TITLE}>Connecting to the lab</h1>
            <p className={CENTER_STATE_TEXT}>
                Reading the current frontier and opening the live event stream…
            </p>
            <span className={LOADING_LINE} aria-hidden="true" />
        </main>
    );
}
