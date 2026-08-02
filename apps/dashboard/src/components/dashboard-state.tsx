import { AlertTriangle, FlaskConical, RefreshCw, Terminal } from "lucide-react";

export function LoadingDashboard() {
    return (
        <main className="center-state" aria-busy="true">
            <span className="center-state__mark center-state__mark--loading">
                <FlaskConical size={28} aria-hidden="true" />
            </span>
            <p className="eyebrow">Local research runtime</p>
            <h1>Connecting to the lab</h1>
            <p>Reading the current frontier and opening the live event stream…</p>
            <span className="loading-line" aria-hidden="true" />
        </main>
    );
}

interface ErrorDashboardProps {
    error: Error;
    retry: () => void;
    retrying: boolean;
}

export function ErrorDashboard({ error, retry, retrying }: ErrorDashboardProps) {
    return (
        <main className="center-state" role="alert">
            <span className="center-state__mark center-state__mark--error">
                <AlertTriangle size={28} aria-hidden="true" />
            </span>
            <p className="eyebrow">Dashboard unavailable</p>
            <h1>Could not read lab status</h1>
            <p>{error.message}</p>
            <div className="command-hint">
                <Terminal size={15} aria-hidden="true" />
                <code>lab start task.json</code>
            </div>
            <button type="button" className="primary-button" onClick={retry} disabled={retrying}>
                <RefreshCw size={15} className={retrying ? "spin" : undefined} aria-hidden="true" />
                {retrying ? "Retrying…" : "Retry connection"}
            </button>
        </main>
    );
}
