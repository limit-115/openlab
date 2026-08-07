import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { MuseAccount } from "#src/muse-cli/muse-account.types";
import { MuseCredentialStore } from "#src/muse-cli/muse-cli.const";

/**
 * Only the fields the lab has to know are named. The credential also holds the token and the key
 * themselves, and nothing here reads them: the CLI presents its own credential, and a secret this
 * process never loads is a secret it can never write into a manifest or a log.
 */
const MuseAuthFileSchema = z.looseObject({
    providers: z.looseObject({
        meta: z.looseObject({
            mechanism: z.string().trim().min(1),
            api_base_url: z.string().trim().min(1),
            user_email: z.string().trim().min(1).optional()
        })
    })
});

/**
 * Reads who the CLI will run as. Muse Code has no command that answers this without opening a
 * terminal UI, so the preflight reads the file the login wrote instead of asking — an interactive
 * screen is not an answer a daemon can wait for.
 *
 * The path follows the same XDG rule the CLI follows, from the same environment the run will get, so
 * an operator who moved their config directory is not told they are signed out.
 */
export async function resolveMuseAccount(
    environment: Readonly<NodeJS.ProcessEnv>
): Promise<MuseAccount> {
    const path = museCredentialPath(environment);
    const parsed = MuseAuthFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
    const meta = parsed.providers.meta;
    return {
        email: meta.user_email ?? null,
        mechanism: meta.mechanism,
        baseUrl: meta.api_base_url
    };
}

/**
 * Where the CLI will look, worked out from the environment the CLI is given rather than from this
 * process. The two can disagree — a daemon started from one account's shell, a home moved for the
 * run — and if they do, the preflight would name one account while the run spent another, which is
 * the single thing this credential reading exists to prevent.
 *
 * Values are used as they were set, never trimmed: whitespace is only ever read to decide whether a
 * variable says anything at all. A trimmed path is a different path, and the CLI would not trim it.
 */
export function museCredentialPath(environment: Readonly<NodeJS.ProcessEnv>): string {
    const configHome = whenSet(environment[MuseCredentialStore.XDG_VARIABLE]);
    const root = configHome
        ? [configHome]
        : [museHome(environment), ...MuseCredentialStore.HOME_SEGMENTS];
    return join(...root, ...MuseCredentialStore.DIRECTORY_SEGMENTS, MuseCredentialStore.FILE_NAME);
}

/** `homedir()` is the last resort rather than the first, for the reason above. */
function museHome(environment: Readonly<NodeJS.ProcessEnv>): string {
    return (
        whenSet(environment[MuseCredentialStore.HOME_VARIABLE]) ??
        whenSet(environment[MuseCredentialStore.WINDOWS_HOME_VARIABLE]) ??
        homedir()
    );
}

function whenSet(value: string | undefined): string | undefined {
    return value !== undefined && value.trim().length > 0 ? value : undefined;
}
