import { Streamdown } from "streamdown";
import { cn } from "#src/design-system/class-names";
import {
    AGENT_PROSE,
    AGENT_PROSE_CONTROLS,
    AGENT_PROSE_PLUGINS,
    AGENT_PROSE_REMARK
} from "#src/team/agent-prose.const";

interface AgentProseProps {
    className?: string;
    /** A sealed turn is finished markdown. An unsealed one is markdown caught mid-token. */
    sealed: boolean;
    text: string;
}

/**
 * The agent's own words, read as the markdown they were written in.
 *
 * Most of what this renders is a turn that is still arriving: an emphasis with no closing pair, a
 * fence with no end. Those are closed for the length of the render rather than printed as the
 * characters that spell them, so a paragraph does not spend its first second showing its own
 * syntax and the rest of the turn does not fall inside an unterminated code block.
 */
export function AgentProse({ className, sealed, text }: AgentProseProps) {
    return (
        <Streamdown
            className={cn(AGENT_PROSE, className)}
            controls={AGENT_PROSE_CONTROLS}
            lineNumbers={false}
            mode={sealed ? "static" : "streaming"}
            plugins={AGENT_PROSE_PLUGINS}
            remarkPlugins={AGENT_PROSE_REMARK}
        >
            {text}
        </Streamdown>
    );
}
