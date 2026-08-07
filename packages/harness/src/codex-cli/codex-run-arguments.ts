import { HarnessExecutionProfiles } from "#src/agent-harness/agent-harness.const";
import type { HarnessRunRequest, HarnessSession } from "#src/agent-harness/agent-harness.types";
import {
    CodexColorModes,
    CodexConfigKeys,
    CodexPermissionArguments,
    CodexPermissionModes,
    CodexProviderFields
} from "#src/codex-cli/codex-cli.const";
import type { CodexModelProvider } from "#src/codex-cli/codex-run-arguments.types";

/**
 * The headless command line for one Codex CLI run. Every harness that drives this binary shares it,
 * so a flag can never drift between the model providers it serves. `--ignore-user-config` is what
 * makes that true: the run is exactly what these arguments say, and nothing on the operator's
 * machine can move the model, the endpoint or the sandbox out from under it.
 */
export function codexRunArguments(
    request: HarnessRunRequest,
    session: HarnessSession,
    responseSchemaPath: string | undefined,
    configOverrides: readonly string[]
): readonly string[] {
    const sharedArguments = [
        "--json",
        "--ignore-user-config",
        "--skip-git-repo-check",
        ...(request.executionProfile === HarnessExecutionProfiles.READ_ONLY
            ? CodexPermissionArguments[CodexPermissionModes.READ_ONLY]
            : CodexPermissionArguments[CodexPermissionModes.UNRESTRICTED]),
        "--model",
        session.model,
        ...configOverrides,
        ...(responseSchemaPath === undefined ? [] : ["--output-schema", responseSchemaPath])
    ];

    if (request.resumeSessionId) {
        return ["exec", "resume", ...sharedArguments, request.resumeSessionId, "-"];
    }

    return ["exec", "--color", CodexColorModes.NEVER, ...sharedArguments, "-"];
}

/** Codex parses an override value as TOML, so every value has to arrive as a quoted string. */
export function codexConfigOverride(key: string, value: string): readonly string[] {
    return ["--config", `${key}=${JSON.stringify(value)}`];
}

/** Codex takes reasoning effort as a config override rather than a flag. */
export function codexReasoningEffortOverride(effort: string): readonly string[] {
    return codexConfigOverride(CodexConfigKeys.MODEL_REASONING_EFFORT, effort);
}

/**
 * Points the CLI at one model provider and states everything about it in the same breath. A provider
 * is named on the command line rather than left in a file because a file is one more thing that can
 * be edited between the lab deciding where a run goes and the run going there.
 */
export function codexModelProviderOverrides(provider: CodexModelProvider): readonly string[] {
    const field = (name: string): string =>
        `${CodexConfigKeys.MODEL_PROVIDERS}.${provider.id}.${name}`;
    return [
        ...codexConfigOverride(CodexConfigKeys.MODEL_PROVIDER, provider.id),
        ...codexConfigOverride(field(CodexProviderFields.NAME), provider.name),
        ...codexConfigOverride(field(CodexProviderFields.BASE_URL), provider.baseUrl),
        ...codexConfigOverride(field(CodexProviderFields.WIRE_API), provider.wireApi),
        ...codexConfigOverride(field(CodexProviderFields.ENV_KEY), provider.envKey)
    ];
}
