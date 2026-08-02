import {
    HarnessAuthenticationMethods,
    HarnessEffortLevels,
    HarnessInputSources,
    HarnessKinds,
    HarnessRunStatuses
} from "@lab/harness/agent-harness.const";
import type { HarnessArtifact, HarnessRunResult } from "@lab/harness/agent-harness.types";
import type { HarnessEvent } from "@lab/harness/harness-event.types";
import type { AgentRunIdentity } from "@lab/protocol/agent-activity/agent-activity.types";
import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";

/** Omitting keys from a union has to distribute, or every event collapses to its common fields. */
type EventBody<Event> = Event extends unknown
    ? Omit<Event, "sequence" | "occurredAt" | "harness" | "sessionId">
    : never;

export const ARTIFACT_DIRECTORY =
    "/lab/workspaces/cycle-1/researcher-000/.lab-artifacts/run-9f0c" as const;

export function activityIdentity(overrides: Partial<AgentRunIdentity> = {}): AgentRunIdentity {
    return {
        agent_id: "agent-researcher-0-1",
        run_id: "run-9f0c",
        branch_id: "branch-researcher-0-1",
        task_id: "task-researcher-0-1",
        role: AgentRole.RESEARCHER,
        execution: {
            harness: AgentHarnessKind.CLAUDE,
            model: "claude-opus-5",
            effort: AgentEffortLevel.HIGH
        },
        artifact_directory: ARTIFACT_DIRECTORY,
        started_at: "2026-08-03T10:00:00.000Z",
        ...overrides
    };
}

/** Stamps an event body the way the harness does, so translation is exercised on real shapes. */
export function harnessEvents(bodies: readonly EventBody<HarnessEvent>[]): HarnessEvent[] {
    return bodies.map(
        (body, index) =>
            ({
                ...body,
                sequence: index + 1,
                occurredAt: "2026-08-03T10:00:01.000Z",
                harness: HarnessKinds.CLAUDE,
                sessionId: "session-1"
            }) as HarnessEvent
    );
}

export function harnessRunResult(overrides: Partial<HarnessRunResult> = {}): HarnessRunResult {
    const artifact: HarnessArtifact = {
        path: `${ARTIFACT_DIRECTORY}/events.jsonl`,
        bytes: 0,
        sha256: ""
    };
    return {
        kind: HarnessKinds.CLAUDE,
        status: HarnessRunStatuses.SUCCEEDED,
        cliVersion: "2.0.0",
        authentication: {
            method: HarnessAuthenticationMethods.CLAUDE_AI,
            subscription: "max"
        },
        session: { model: "claude-opus-5", effort: HarnessEffortLevels.HIGH },
        sessionId: "session-1",
        startedAt: "2026-08-03T10:00:00.000Z",
        finishedAt: "2026-08-03T10:05:00.000Z",
        exitCode: 0,
        signal: null,
        error: null,
        timeoutMs: 3_600_000,
        command: {
            file: "claude",
            args: ["-p"],
            cwd: "/lab/workspaces/cycle-1/researcher-000",
            stdin: HarnessInputSources.PROMPT,
            removedEnvironmentVariables: []
        },
        artifacts: {
            prompt: artifact,
            nativeEvents: artifact,
            events: artifact,
            stderr: artifact,
            manifest: artifact
        },
        ...overrides
    };
}
