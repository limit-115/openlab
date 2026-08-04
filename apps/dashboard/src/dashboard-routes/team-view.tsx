import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { useOutletContext } from "react-router";
import { TeamPanel } from "#src/team/team-panel";
import { useAgentActivity } from "#src/team/team-stream";

/**
 * The stream belongs to this route, and only the Team address renders it, so an investigation nobody is
 * watching is never asked for frames.
 */
export function TeamView() {
    const snapshot = useOutletContext<StatusSnapshot>();
    const { agents } = useAgentActivity(snapshot.investigation.id);

    return <TeamPanel agents={agents} runs={snapshot.runs} />;
}
