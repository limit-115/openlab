import { HarnessExecutionProfiles } from "#src/agent-harness/agent-harness.const";
import type { HarnessRunRequest, HarnessSession } from "#src/agent-harness/agent-harness.types";
import { ClaudeOutputFormats, ClaudePermissionModes } from "#src/claude-cli/claude-cli.const";
import { responseJsonSchema } from "#src/subscription-cli-harness/response-schema";

/**
 * The headless command line for one Claude CLI run. Every harness that drives this binary shares it,
 * so a flag can never drift between the model providers it serves.
 */
export function claudeRunArguments(
    request: HarnessRunRequest,
    session: HarnessSession
): readonly string[] {
    const readOnly = request.executionProfile === HarnessExecutionProfiles.READ_ONLY;
    return [
        "-p",
        "--output-format",
        ClaudeOutputFormats.STREAM_JSON,
        "--verbose",
        "--include-partial-messages",
        ...(readOnly ? [] : ["--dangerously-skip-permissions"]),
        "--permission-mode",
        readOnly ? ClaudePermissionModes.PLAN : ClaudePermissionModes.BYPASS_PERMISSIONS,
        "--setting-sources",
        "",
        "--model",
        session.model,
        "--effort",
        session.effort,
        ...(request.responseSchema === undefined
            ? []
            : ["--json-schema", JSON.stringify(responseJsonSchema(request.responseSchema))])
    ];
}

/** Asks the CLI which credential it will actually use, without loading operator settings. */
export function claudeAuthenticationCommand(): readonly string[] {
    return ["--setting-sources", "", "auth", "status", "--json"];
}
