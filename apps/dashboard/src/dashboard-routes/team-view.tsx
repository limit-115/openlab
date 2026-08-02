import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { useOutletContext } from "react-router";
import { TeamPanel } from "#src/team/team-panel";
import { useAgentActivity } from "#src/team/team-stream";

/**
 * The stream belongs to this route, and only the Team address renders it, so a lab nobody is
 * watching is never asked for frames.
 */
export function TeamView() {
    const snapshot = useOutletContext<StatusSnapshot>();
    const { agents } = useAgentActivity();

    return <TeamPanel agents={agents} tasks={snapshot.tasks} />;
}
