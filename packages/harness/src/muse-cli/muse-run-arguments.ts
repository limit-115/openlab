import { resolve } from "node:path";
import { HarnessExecutionProfiles } from "#src/agent-harness/agent-harness.const";
import type { HarnessRunRequest, HarnessSession } from "#src/agent-harness/agent-harness.types";
import { MuseProviders, MuseReasoningEfforts } from "#src/muse-cli/muse-cli.const";

/**
 * The headless command line for one Muse Code run.
 *
 * `--base-url` is absent and stays absent: it is the flag that would move a run off Meta's own host
 * while everything else about the run still reads as Muse. The prompt arrives as a file rather than
 * as the trailing argument because a research prompt on the command line is readable in the process
 * table by every account on the machine, and this CLI does not read stdin at all.
 *
 * Muse Code's own session log is left switched on. The lab records the stdout stream itself, but a
 * Muse run delegates to subagents whose transcripts never appear there — they are written beside the
 * session as files of their own, and turning the log off would throw away the only copy.
 */
export function museRunArguments(
    request: HarnessRunRequest,
    session: HarnessSession,
    promptPath: string
): readonly string[] {
    const readOnly = request.executionProfile === HarnessExecutionProfiles.READ_ONLY;
    return [
        "exec",
        "--json",
        "--prompt-file",
        promptPath,
        "--provider",
        MuseProviders.META,
        "--model",
        session.model,
        "--reasoning-effort",
        MuseReasoningEfforts[session.effort],
        "--workspace",
        resolve(request.cwd),
        /**
         * Approval is on by default and every tool call would stop for a person who is not there.
         * `muse exec` takes this as a switch rather than as the root command's `--approval-mode`,
         * which it does not accept at all.
         */
        "--disable-approval",
        /**
         * The run is what these arguments say and nothing else. Muse loads rules and skills from a
         * workspace the operator has trusted and from other agents' personal directories; both would
         * put instructions the lab never wrote into a research run, so neither is invited.
         */
        "--no-foreign-personal-context",
        /**
         * An agent that stops to ask a person would hang until the six-hour watchdog fires. The lab
         * has its own way to put a question to the operator, so the CLI's is answered as cancelled.
         */
        "--user-input-auto-resolve",
        ...(readOnly ? ["--disable-write", "--disable-shell"] : ["--disable-sandbox"])
    ];
}
