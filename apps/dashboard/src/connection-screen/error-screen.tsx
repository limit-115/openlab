import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";
import {
    CENTER_STATE,
    CENTER_STATE_MARK,
    CENTER_STATE_MARK_ERROR,
    CENTER_STATE_TEXT,
    CENTER_STATE_TITLE,
    COMMAND_HINT,
    COMMAND_HINT_CODE,
    PRIMARY_BUTTON,
    SPIN
} from "#src/connection-screen/connection-screen.const";
import { EYEBROW } from "#src/panel/panel.const";

interface ErrorDashboardProps {
    error: Error;
    retry: () => void;
    retrying: boolean;
}

export function ErrorDashboard({ error, retry, retrying }: ErrorDashboardProps) {
    return (
        <main className={CENTER_STATE} role="alert">
            <span className={`${CENTER_STATE_MARK} ${CENTER_STATE_MARK_ERROR}`}>
                <AlertTriangle size={28} aria-hidden="true" />
            </span>
            <p className={EYEBROW}>Dashboard unavailable</p>
            <h1 className={CENTER_STATE_TITLE}>Could not read lab status</h1>
            <p className={CENTER_STATE_TEXT}>{error.message}</p>
            <div className={COMMAND_HINT}>
                <Terminal size={15} aria-hidden="true" />
                <code className={COMMAND_HINT_CODE}>lab start task.json</code>
            </div>
            <button type="button" className={PRIMARY_BUTTON} onClick={retry} disabled={retrying}>
                <RefreshCw size={15} className={retrying ? SPIN : undefined} aria-hidden="true" />
                {retrying ? "Retrying…" : "Retry connection"}
            </button>
        </main>
    );
}
