import { HarnessAuthenticationMethods } from "@openlab/harness/agent-harness.const";
import type {
    AgentHarness,
    HarnessPreflight,
    HarnessRunRequest,
    HarnessSession
} from "@openlab/harness/agent-harness.types";
import { HarnessCapabilityError } from "@openlab/harness/harness-error";
import { HarnessCapabilityGaps } from "@openlab/harness/harness-error.const";
import type { HarnessEvent } from "@openlab/harness/harness-event.types";
import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

/**
 * A harness that answers a preflight without a CLI behind it, and counts how many times it was
 * asked. Everything the lab decides about a harness before it runs anything comes out of that one
 * call, so a test can state the machine it is standing on by choosing the answer.
 */
export class StubHarness implements AgentHarness {
    preflights = 0;
    readonly kind: AgentHarnessKind;
    readonly #answer: () => Promise<HarnessPreflight>;

    constructor(kind: AgentHarnessKind, answer: () => Promise<HarnessPreflight>) {
        this.kind = kind;
        this.#answer = answer;
    }

    resolveSession(_request: HarnessRunRequest): HarnessSession {
        throw new Error("A stub harness runs no agents");
    }

    preflight(): Promise<HarnessPreflight> {
        this.preflights += 1;
        return this.#answer();
    }

    run(_request: HarnessRunRequest): AsyncIterable<HarnessEvent> {
        throw new Error("A stub harness runs no agents");
    }
}

export function harnessSignedIn(
    kind: AgentHarnessKind,
    cliVersion: string,
    plan: string
): StubHarness {
    return new StubHarness(kind, () =>
        Promise.resolve({
            kind,
            cliVersion,
            authentication: { method: HarnessAuthenticationMethods.CHATGPT, subscription: plan }
        })
    );
}

/** What every harness looks like on a machine where nothing has been installed yet. */
export function harnessNotInstalled(kind: AgentHarnessKind): StubHarness {
    return new StubHarness(kind, () =>
        Promise.reject(
            new HarnessCapabilityError(
                kind,
                HarnessCapabilityGaps.INSTALLATION,
                `${kind} CLI is unavailable`,
                {
                    need: `${kind} CLI with an active product subscription login`,
                    reason: `The ${kind} agent cannot run without proven subscription authentication`,
                    provisioningHint: `Install ${kind}, log in interactively, then retry`
                }
            )
        )
    );
}

/** An installed CLI whose login is not one the lab may bill: an API key, a console account. */
export function harnessNotSignedIn(kind: AgentHarnessKind): StubHarness {
    return new StubHarness(kind, () =>
        Promise.reject(
            new HarnessCapabilityError(
                kind,
                HarnessCapabilityGaps.SUBSCRIPTION,
                `${kind} CLI is not authenticated through a product subscription`,
                {
                    need: `${kind} CLI logged in through an active product subscription`,
                    reason: "Usage-billed authentication is forbidden",
                    provisioningHint: `Log in to ${kind} interactively and retry`
                }
            )
        )
    );
}
