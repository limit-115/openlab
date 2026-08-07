import {
    HarnessAuthenticationMethods,
    type HarnessInputSource,
    HarnessInputSources,
    HarnessKinds
} from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessPreflight,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEvent } from "#src/agent-harness/harness-event.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import { HarnessCapabilityError, HarnessRequestError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { resolveMuseAccount } from "#src/muse-cli/muse-account";
import type { MuseAccount, ResolveMuseAccount } from "#src/muse-cli/muse-account.types";
import {
    MUSE_BASE_URL,
    MUSE_BINARY,
    MUSE_NO_AUTO_UPDATE_VALUE,
    MUSE_NO_AUTO_UPDATE_VARIABLE,
    MuseAuthMechanisms,
    MuseSessionDefaults
} from "#src/muse-cli/muse-cli.const";
import { MuseEventParser } from "#src/muse-cli/muse-event-parser";
import type { MuseHarnessOptions } from "#src/muse-cli/muse-harness.types";
import { museRunArguments } from "#src/muse-cli/muse-run-arguments";
import { museStructuredPrompt } from "#src/muse-cli/muse-structured-response";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    HarnessRunPaths
} from "#src/subscription-cli-harness/subscription-cli-harness.types";

/**
 * Meta's Muse Code, driven headless through `muse exec`.
 *
 * It is the second harness the lab runs that no subscription pays for, and unlike DeepSeek there is
 * not even a wallet to read: Meta sells Muse Code by the token, publishes no balance the CLI can be
 * asked for, and emits no token counts in its event stream. A Muse investigation therefore spends
 * money the lab cannot meter while it is spending it, and nothing here pretends otherwise — the
 * preflight says the run is metered, the harness setup card says it before the operator picks the
 * harness, and no spend cap can be set against it because there is no window to take a fraction of.
 */
export class MuseHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.MUSE;
    readonly #resolveAccount: ResolveMuseAccount;
    readonly #environment: Readonly<NodeJS.ProcessEnv>;
    #held: Promise<MuseAccount> | undefined;

    constructor(options: MuseHarnessOptions = {}) {
        super(MUSE_BINARY, options);
        this.#resolveAccount = options.resolveAccount ?? resolveMuseAccount;
        this.#environment = options.environment ?? process.env;
    }

    /** One credential reading serves a whole preflight or run, and the next one asks again. */
    override async preflight(signal?: AbortSignal): Promise<HarnessPreflight> {
        try {
            return await super.preflight(signal);
        } finally {
            this.#held = undefined;
        }
    }

    /**
     * `muse resume` continues a session and `muse exec --session-id` names one, and the lab has not
     * established that the second does the first. Starting a fresh session under a borrowed id would
     * leave a manifest claiming continuity that never happened, so a resume is refused in words
     * instead. Nothing in the lab resumes a harness session today.
     */
    override async *run(
        request: HarnessRunRequest,
        signal?: AbortSignal
    ): AsyncIterable<HarnessEvent> {
        if (request.resumeSessionId !== undefined) {
            throw new HarnessRequestError(
                this.kind,
                "Muse Code runs cannot be resumed: the CLI resumes a session interactively and its headless mode only names one"
            );
        }

        try {
            yield* super.run(request, signal);
        } finally {
            this.#held = undefined;
        }
    }

    /**
     * Muse Code has no command that reports the account it is signed in as: `muse login` opens a
     * browser and `muse whoami` draws a terminal UI, and a daemon can wait for neither. The version
     * probe the preflight already makes is the liveness check, and this asks for it a second time
     * only because the base class expects a command; what actually paid is read from the credential.
     */
    protected authenticationCommand(): readonly string[] {
        return ["--version"];
    }

    protected override extendEnvironment(
        sanitized: Record<string, string>
    ): Record<string, string> {
        return {
            ...sanitized,
            [MUSE_NO_AUTO_UPDATE_VARIABLE]: MUSE_NO_AUTO_UPDATE_VALUE
        };
    }

    protected async parseAuthentication(): Promise<HarnessAuthentication> {
        const account = await this.#account();
        if (account.mechanism !== MuseAuthMechanisms.OAUTH) {
            throw this.#unusableCredential(
                new Error(
                    `Muse Code is authenticated by ${account.mechanism} rather than a Meta-account login`
                )
            );
        }
        /**
         * A credential that points somewhere else was issued somewhere else. The run would still
         * look like Muse in every record the lab keeps while being billed to an account the manifest
         * cannot name, which is the one thing the pinned endpoint exists to make impossible.
         */
        if (account.baseUrl !== MUSE_BASE_URL) {
            throw this.#unusableCredential(
                new Error(`Muse Code would talk to ${account.baseUrl} rather than ${MUSE_BASE_URL}`)
            );
        }

        return {
            method: HarnessAuthenticationMethods.META_ACCOUNT,
            subscription: null,
            wallet: account.email === null ? "metered" : `metered, billed to ${account.email}`
        };
    }

    protected sessionDefaults(): HarnessSession {
        return { model: MuseSessionDefaults.MODEL, effort: MuseSessionDefaults.EFFORT };
    }

    /** `muse exec` does not read stdin; a prompt written into one is a run that never starts. */
    protected override inputSource(): HarnessInputSource {
        return HarnessInputSources.PROMPT_FILE;
    }

    protected override promptFor(request: HarnessRunRequest): string {
        return request.responseSchema === undefined
            ? request.prompt
            : museStructuredPrompt(request.prompt, request.responseSchema);
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        paths: HarnessRunPaths
    ): HarnessCommand {
        return { args: museRunArguments(request, session, paths.prompt) };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new MuseEventParser(request.responseSchema !== undefined);
    }

    async #account(): Promise<MuseAccount> {
        this.#held ??= this.#resolveAccount(this.#environment);
        try {
            return await this.#held;
        } catch (error) {
            throw this.#unusableCredential(error);
        }
    }

    #unusableCredential(cause: unknown): HarnessCapabilityError {
        return new HarnessCapabilityError(
            this.kind,
            HarnessCapabilityGaps.SUBSCRIPTION,
            "Muse Code is not signed in to a Meta account the lab can name",
            {
                need: "Muse Code signed in with `muse login` against Meta's own host",
                reason: "Muse Code is billed by the token, so a run has to name the account it spends",
                provisioningHint: "Run `muse login`, approve the code in the browser, and retry"
            },
            { cause }
        );
    }
}
