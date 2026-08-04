import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { TeamPanel } from "#src/team/team-panel";
import { useAgentActivity } from "#src/team/team-stream";

/**
 * The stream belongs to this view, and its tab is mounted only while it is the one being read, so an
 * investigation nobody is watching is never asked for frames.
 */
export function TeamView({ snapshot }: { snapshot: StatusSnapshot }) {
    const { agents } = useAgentActivity(snapshot.investigation.id);

    return <TeamPanel agents={agents} runs={snapshot.runs} />;
}
