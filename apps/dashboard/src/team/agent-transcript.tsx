import { AgentActivityFrameKind } from "@lab/protocol/agent-activity/agent-activity-frame.const";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "#src/design-system/class-names";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "#src/design-system/collapsible";
import type {
    TranscriptDiagnostic,
    TranscriptEntry,
    TranscriptToolCall,
    TranscriptTurn
} from "#src/team/agent-transcript.types";
import {
    AGENT_TRANSCRIPT,
    DIAGNOSTIC_TONE,
    NO_ACTIVITY_YET,
    TOOL_PHASE_MARK,
    TRANSCRIPT_DETAIL,
    TRANSCRIPT_TEXT,
    TRANSCRIPT_THINKING_TRIGGER,
    TRANSCRIPT_TOOL
} from "#src/team/team-panel.const";

interface AgentTranscriptProps {
    entries: readonly TranscriptEntry[];
}

export function AgentTranscript({ entries }: AgentTranscriptProps) {
    const scroller = useFollowingScroller(entries);

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">{NO_ACTIVITY_YET}</p>;
    }

    return (
        <div className={AGENT_TRANSCRIPT} ref={scroller}>
            {entries.map((entry) => (
                <TranscriptLine key={entry.id} entry={entry} />
            ))}
        </div>
    );
}

/**
 * Follows the newest words, unless the operator has scrolled up to read something, in which case the
 * stream is left alone until they come back to the bottom.
 *
 * It follows the entries themselves rather than how many there are, because a turn being written
 * grows the last line instead of adding one.
 */
function useFollowingScroller(entries: readonly TranscriptEntry[]) {
    const scroller = useRef<HTMLDivElement>(null);
    const following = useRef(true);

    useEffect(() => {
        const element = scroller.current;
        if (element === null) {
            return;
        }
        const watch = () => {
            const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
            following.current = distance < 32;
        };
        element.addEventListener("scroll", watch);
        return () => element.removeEventListener("scroll", watch);
    }, []);

    useEffect(() => {
        const element = scroller.current;
        if (element !== null && following.current && entries.length > 0) {
            element.scrollTop = element.scrollHeight;
        }
    }, [entries]);

    return scroller;
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
    switch (entry.kind) {
        case AgentActivityFrameKind.THINKING:
            return <ThinkingLine turn={entry} />;
        case AgentActivityFrameKind.MESSAGE:
            return <p className={cn(TRANSCRIPT_TEXT, "border-primary/40")}>{entry.text}</p>;
        case AgentActivityFrameKind.TOOL:
            return <ToolLine call={entry} />;
        case AgentActivityFrameKind.DIAGNOSTIC:
            return <DiagnosticLine diagnostic={entry} />;
    }
}

/** Reasoning is folded away by default: it is the longest thing an agent produces and the least read. */
function ThinkingLine({ turn }: { turn: TranscriptTurn }) {
    return (
        <Collapsible>
            <CollapsibleTrigger className={cn(TRANSCRIPT_THINKING_TRIGGER, "group/thinking")}>
                <ChevronRightIcon
                    className="size-4 transition-transform group-data-[state=open]/thinking:rotate-90"
                    aria-hidden="true"
                />
                Thinking · {turn.text.length} characters
            </CollapsibleTrigger>
            <CollapsibleContent>
                <p className={cn(TRANSCRIPT_TEXT, "mt-1 ml-1 border-muted text-muted-foreground")}>
                    {turn.text}
                </p>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ToolLine({ call }: { call: TranscriptToolCall }) {
    return (
        <p className={TRANSCRIPT_TOOL}>
            <span className={TOOL_PHASE_MARK[call.phase]} aria-hidden="true" />
            <span className="font-medium">{call.toolName}</span>
            {call.detail === null ? null : <span className={TRANSCRIPT_DETAIL}>{call.detail}</span>}
        </p>
    );
}

function DiagnosticLine({ diagnostic }: { diagnostic: TranscriptDiagnostic }) {
    return (
        <p className={cn("text-sm break-words", DIAGNOSTIC_TONE[diagnostic.level])}>
            {diagnostic.message}
        </p>
    );
}
