import { AgentActivityFrameKind } from "@nightlab/protocol/agent-activity/agent-activity-frame.const";
import { ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStickToBottom } from "use-stick-to-bottom";
import { cn } from "#src/design-system/class-names";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "#src/design-system/collapsible";
import { AgentProse } from "#src/team/agent-prose";
import type {
    TranscriptDiagnostic,
    TranscriptEntry,
    TranscriptToolCall,
    TranscriptTurn
} from "#src/team/agent-transcript.types";
import { TEAM_NAMESPACE } from "#src/team/team.i18n";
import {
    AGENT_TRANSCRIPT,
    DIAGNOSTIC_TONE,
    TOOL_PHASE_MARK,
    TRANSCRIPT_DETAIL,
    TRANSCRIPT_ENTRIES,
    TRANSCRIPT_INITIAL_SCROLL,
    TRANSCRIPT_TEXT,
    TRANSCRIPT_THINKING_TRIGGER,
    TRANSCRIPT_TOOL
} from "#src/team/team-panel.const";

interface AgentTranscriptProps {
    entries: readonly TranscriptEntry[];
}

/**
 * Follows the newest words, unless the operator has scrolled up to read something, in which case the
 * stream is left alone until they come back to the bottom.
 *
 * The follower watches the lines resize rather than counting them, because a turn being written
 * grows the last line instead of adding one.
 */
export function AgentTranscript({ entries }: AgentTranscriptProps) {
    const { t } = useTranslation(TEAM_NAMESPACE);
    const { scrollRef, contentRef } = useStickToBottom({ initial: TRANSCRIPT_INITIAL_SCROLL });

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">{t("noActivity")}</p>;
    }

    return (
        <div className={AGENT_TRANSCRIPT} ref={scrollRef}>
            <div className={TRANSCRIPT_ENTRIES} ref={contentRef}>
                {entries.map((entry) => (
                    <TranscriptLine key={entry.id} entry={entry} />
                ))}
            </div>
        </div>
    );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
    switch (entry.kind) {
        case AgentActivityFrameKind.THINKING:
            return <ThinkingLine turn={entry} />;
        case AgentActivityFrameKind.MESSAGE:
            return (
                <AgentProse
                    className={cn(TRANSCRIPT_TEXT, "border-primary/40")}
                    sealed={entry.sealed}
                    text={entry.text}
                />
            );
        case AgentActivityFrameKind.TOOL:
            return <ToolLine call={entry} />;
        case AgentActivityFrameKind.DIAGNOSTIC:
            return <DiagnosticLine diagnostic={entry} />;
    }
}

/** Reasoning is folded away by default: it is the longest thing an agent produces and the least read. */
function ThinkingLine({ turn }: { turn: TranscriptTurn }) {
    const { t } = useTranslation(TEAM_NAMESPACE);

    return (
        <Collapsible>
            <CollapsibleTrigger className={cn(TRANSCRIPT_THINKING_TRIGGER, "group/thinking")}>
                <ChevronRightIcon
                    className="size-4 transition-transform group-data-[state=open]/thinking:rotate-90"
                    aria-hidden="true"
                />
                {t("thinking", { count: turn.text.length })}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <AgentProse
                    className={cn(TRANSCRIPT_TEXT, "mt-1 ml-1 border-muted text-muted-foreground")}
                    sealed={turn.sealed}
                    text={turn.text}
                />
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
        <p className={cn("text-sm wrap-anywhere", DIAGNOSTIC_TONE[diagnostic.level])}>
            {diagnostic.message}
        </p>
    );
}
