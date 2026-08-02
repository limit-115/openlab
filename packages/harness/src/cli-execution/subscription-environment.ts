import {
    ForbiddenEnvironmentPrefix,
    ForbiddenEnvironmentVariable
} from "#src/cli-execution/subscription-environment.const";

const forbiddenEnvironmentVariables: ReadonlySet<string> = new Set(
    Object.values(ForbiddenEnvironmentVariable)
);
const forbiddenEnvironmentPrefixes = Object.values(ForbiddenEnvironmentPrefix);

export function sanitizeHarnessEnvironment(
    source: Readonly<NodeJS.ProcessEnv> = process.env
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(source).filter(
            (entry): entry is [string, string] =>
                entry[1] !== undefined && !isForbiddenHarnessEnvironmentVariable(entry[0])
        )
    );
}

export function removedHarnessEnvironmentVariables(
    source: Readonly<NodeJS.ProcessEnv> = process.env
): readonly string[] {
    return Object.keys(source).filter(isForbiddenHarnessEnvironmentVariable).sort();
}

export function isForbiddenHarnessEnvironmentVariable(name: string): boolean {
    return (
        forbiddenEnvironmentVariables.has(name) ||
        forbiddenEnvironmentPrefixes.some((prefix) => name.startsWith(prefix))
    );
}
