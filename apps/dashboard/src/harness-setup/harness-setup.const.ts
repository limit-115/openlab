import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";

/**
 * How often the lab is asked to run the CLIs again while the setup page is open. An operator on this
 * page is installing something in another window, so the page has to notice on its own: being told
 * to press refresh after every command is the setup doing nothing that the operator cannot see.
 */
export const HARNESS_CHECK_INTERVAL_MS = 5_000;

/**
 * What puts each CLI on the machine. Both Anthropic-served harnesses run the same binary — GLM is
 * Z.ai's coding plan spoken through the Claude CLI — so installing one installs the other, which the
 * copy beside it says outright.
 */
export const HARNESS_INSTALL_COMMAND: Record<AgentHarnessKind, string> = {
    [AgentHarnessKind.CODEX]: "npm install -g @openai/codex",
    [AgentHarnessKind.CLAUDE]: "npm install -g @anthropic-ai/claude-code",
    [AgentHarnessKind.GLM]: "npm install -g @anthropic-ai/claude-code"
};

/**
 * What signs a CLI in to the subscription it bills. GLM has no command: its credential is left
 * behind by the ZCode desktop sign-in, so that card gives the operator the steps instead.
 */
export const HARNESS_SIGN_IN_COMMAND: Record<AgentHarnessKind, string | null> = {
    [AgentHarnessKind.CODEX]: "codex login",
    [AgentHarnessKind.CLAUDE]: "claude auth login",
    [AgentHarnessKind.GLM]: null
};

/** The sentence under a card that is not installed, in the words that harness needs. */
export const HARNESS_INSTALL_NOTE = {
    [AgentHarnessKind.CODEX]: "installCodex",
    [AgentHarnessKind.CLAUDE]: "installClaude",
    [AgentHarnessKind.GLM]: "installGlm"
} as const satisfies Record<AgentHarnessKind, string>;

export const HARNESS_SIGN_IN_NOTE = {
    [AgentHarnessKind.CODEX]: "signInCodex",
    [AgentHarnessKind.CLAUDE]: "signInClaude",
    [AgentHarnessKind.GLM]: "signInGlm"
} as const satisfies Record<AgentHarnessKind, string>;

export const HARNESS_LIST = "grid gap-3" as const;
export const HARNESS_CARD = "flex flex-col gap-2 rounded-xl border p-4" as const;
export const HARNESS_CARD_READY = "border-primary/50" as const;
export const HARNESS_CARD_HEADER = "flex flex-wrap items-center gap-2" as const;
export const HARNESS_CARD_NAME = "font-medium" as const;
export const HARNESS_CARD_VERSION = "text-muted-foreground" as const;
export const HARNESS_CARD_NOTE = "text-muted-foreground text-pretty" as const;
export const HARNESS_COMMAND_ROW =
    "flex items-center justify-between gap-2 rounded-lg bg-muted/50 py-1 ps-3 pe-1" as const;
export const HARNESS_COMMAND = "font-mono text-sm break-all select-all" as const;
export const HARNESS_CARD_ERROR = "text-destructive text-pretty break-words" as const;
export const HARNESS_ICON_READY = "text-primary" as const;
export const HARNESS_ICON_TODO = "text-muted-foreground" as const;
export const HARNESS_ICON_BROKEN = "text-destructive" as const;
export const HARNESS_SETUP_NOTE = "text-muted-foreground text-pretty" as const;
export const HARNESS_SETUP_WARNING = "border-l-2 border-primary/40 pl-4 text-pretty" as const;
export const HARNESS_SETUP_PENDING = "flex items-center gap-2 text-muted-foreground" as const;
