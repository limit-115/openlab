import { HarnessAuthenticationMethods, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessPreflight,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEvent } from "#src/agent-harness/harness-event.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { CodexEventParser } from "#src/codex-cli/codex-event-parser";
import {
    codexModelProviderOverrides,
    codexReasoningEffortOverride,
    codexRunArguments
} from "#src/codex-cli/codex-run-arguments";
import {
    DEEPSEEK_API_KEY_VARIABLE,
    DEEPSEEK_BASE_URL,
    DEEPSEEK_BINARY,
    DeepseekProvider,
    DeepseekReasoningEfforts,
    DeepseekSessionDefaults
} from "#src/deepseek-cli/deepseek-cli.const";
import { resolveDeepseekWallet, walletBalanceSummary } from "#src/deepseek-cli/deepseek-credential";
import type {
    DeepseekWallet,
    ResolveDeepseekWallet
} from "#src/deepseek-cli/deepseek-credential.types";
import type { DeepseekHarnessOptions } from "#src/deepseek-cli/deepseek-harness.types";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    HarnessRunPaths
} from "#src/subscription-cli-harness/subscription-cli-harness.types";

/**
 * DeepSeek driven through the Codex CLI, which speaks the Responses API that DeepSeek serves. It is
 * paid for by the wallet behind the key rather than by a subscription, so an investigation left
 * running costs money for as long as it runs. What stops it is the floor the operator sets under the
 * wallet: the balance is read before each dispatch, and the lab passes DeepSeek over while the money
 * is down to what they asked to keep.
 */
export class DeepseekHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.DEEPSEEK;
    readonly #resolveWallet: ResolveDeepseekWallet;
    #held: Promise<DeepseekWallet> | undefined;

    constructor(options: DeepseekHarnessOptions = {}) {
        super(DEEPSEEK_BINARY, options);
        this.#resolveWallet = options.resolveWallet ?? resolveDeepseekWallet;
    }

    /**
     * One wallet reading serves a whole preflight or run. The credential is asked for three times on
     * the way to a spawned process — twice to build an environment and once to report what is paying
     * — and reading it three times would let an operator who replaces the key mid-flight end up with
     * a manifest naming one wallet and a process spending another. It is dropped afterwards so the
     * next run asks again rather than reporting a balance from an hour ago.
     */
    override async preflight(signal?: AbortSignal): Promise<HarnessPreflight> {
        try {
            return await super.preflight(signal);
        } finally {
            this.#held = undefined;
        }
    }

    override async *run(
        request: HarnessRunRequest,
        signal?: AbortSignal
    ): AsyncIterable<HarnessEvent> {
        try {
            yield* super.run(request, signal);
        } finally {
            this.#held = undefined;
        }
    }

    /**
     * Asked of the CLI only so that a binary which cannot answer fails here rather than mid-run. What
     * it reports about its own login is deliberately not read: a DeepSeek run authenticates with the
     * key this harness injects, and a machine signed in to ChatGPT and a machine signed in to nothing
     * run DeepSeek identically.
     */
    protected authenticationCommand(): readonly string[] {
        return ["login", "status"];
    }

    protected override async extendEnvironment(
        sanitized: Record<string, string>
    ): Promise<Record<string, string>> {
        const wallet = await this.#wallet();
        return { ...sanitized, [DEEPSEEK_API_KEY_VARIABLE]: wallet.apiKey };
    }

    /**
     * The wallet is the credential, so what it says is what the preflight reports. A wallet DeepSeek
     * will no longer serve is refused here rather than at the first turn of a run: the run would fail
     * anyway, and failing now names the reason instead of leaving a half-written investigation.
     */
    protected async parseAuthentication(): Promise<HarnessAuthentication> {
        const wallet = await this.#wallet();
        const summary = walletBalanceSummary(wallet.balances);
        if (!wallet.available) {
            throw this.#unusableWallet(
                new Error(
                    `DeepSeek reports this wallet cannot be spent (${summary ?? "no balance stated"})`
                )
            );
        }

        return {
            method: HarnessAuthenticationMethods.DEEPSEEK_API_KEY,
            subscription: null,
            wallet: summary
        };
    }

    protected sessionDefaults(): HarnessSession {
        return { model: DeepseekSessionDefaults.MODEL, effort: DeepseekSessionDefaults.EFFORT };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        paths: HarnessRunPaths
    ): HarnessCommand {
        return {
            args: [
                ...codexRunArguments(request, session, paths.responseSchema, [
                    ...codexReasoningEffortOverride(DeepseekReasoningEfforts[session.effort]),
                    ...codexModelProviderOverrides({
                        id: DeepseekProvider.ID,
                        name: DeepseekProvider.NAME,
                        baseUrl: DEEPSEEK_BASE_URL,
                        wireApi: DeepseekProvider.WIRE_API,
                        envKey: DEEPSEEK_API_KEY_VARIABLE
                    })
                ])
            ]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new CodexEventParser(request.responseSchema !== undefined);
    }

    async #wallet(): Promise<DeepseekWallet> {
        this.#held ??= this.#resolveWallet();
        try {
            return await this.#held;
        } catch (error) {
            throw this.#unusableWallet(error);
        }
    }

    #unusableWallet(cause: unknown): HarnessCapabilityError {
        return new HarnessCapabilityError(
            this.kind,
            HarnessCapabilityGaps.SUBSCRIPTION,
            "The lab holds no DeepSeek key it can spend",
            {
                need: "A DeepSeek API key with a wallet DeepSeek will still serve",
                reason: "DeepSeek authenticates every run with a key the operator gives the lab",
                provisioningHint:
                    "Create a key at platform.deepseek.com and give it to the lab on the harness setup page"
            },
            { cause }
        );
    }
}
