import { type HarnessKind, HarnessKinds } from "@openlab/harness/agent-harness.const";
import { readSubscriptionAllowance } from "@openlab/harness/subscription-allowance";
import type { SubscriptionAllowance } from "@openlab/protocol/subscription-allowance/subscription-allowance.types";
import {
    allowanceFromReading,
    unreadableAllowance
} from "#src/subscription-allowance/subscription-allowance";
import { ALLOWANCE_READING_TTL_MILLISECONDS } from "#src/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceReadingsOptions,
    ReadHarnessAllowance
} from "#src/subscription-allowance/subscription-allowance-readings.types";

const ALL_HARNESS_KINDS: readonly HarnessKind[] = Object.values(HarnessKinds);

interface CachedReading {
    readonly allowance: SubscriptionAllowance;
    readonly at: number;
}

/**
 * Holds the last answer from each vendor. Every dashboard poll and every dispatch decision reads
 * through here, so a vendor is asked once per interval however many callers want to know, and two
 * callers arriving together share one request rather than launching two.
 */
export class SubscriptionAllowanceReadings {
    readonly #read: ReadHarnessAllowance;
    readonly #ttlMs: number;
    readonly #now: () => number;
    readonly #cached = new Map<HarnessKind, CachedReading>();
    readonly #pending = new Map<HarnessKind, Promise<SubscriptionAllowance>>();

    constructor(options: AllowanceReadingsOptions = {}) {
        this.#read = options.read ?? readSubscriptionAllowance;
        this.#ttlMs = options.ttlMs ?? ALLOWANCE_READING_TTL_MILLISECONDS;
        this.#now = options.now ?? Date.now;
    }

    read(kind: HarnessKind, signal?: AbortSignal): Promise<SubscriptionAllowance> {
        const cached = this.#cached.get(kind);
        if (cached !== undefined && this.#now() - cached.at < this.#ttlMs) {
            return Promise.resolve(cached.allowance);
        }

        return this.#ask(kind, signal);
    }

    readAll(signal?: AbortSignal): Promise<SubscriptionAllowance[]> {
        return Promise.all(ALL_HARNESS_KINDS.map((kind) => this.read(kind, signal)));
    }

    /**
     * Asks every vendor again however much of the interval the held reading has left. An operator
     * who presses refresh is saying the numbers on the page are not the ones they want, and serving
     * them the answer they are already looking at would make the button do nothing for a minute.
     */
    refreshAll(signal?: AbortSignal): Promise<SubscriptionAllowance[]> {
        return Promise.all(ALL_HARNESS_KINDS.map((kind) => this.#ask(kind, signal)));
    }

    /** One request per vendor at a time, so callers arriving together join the one in flight. */
    #ask(kind: HarnessKind, signal?: AbortSignal): Promise<SubscriptionAllowance> {
        const pending = this.#pending.get(kind);
        if (pending !== undefined) {
            return pending;
        }

        const reading = this.#readVendor(kind, signal).finally(() => this.#pending.delete(kind));
        this.#pending.set(kind, reading);
        return reading;
    }

    /**
     * A vendor that refuses one reading has not given the allowance back. Anthropic throttles the
     * usage endpoint itself, and forgetting a spent plan on a throttled poll would send the next run
     * straight into it, so the last answer stands and only its interval restarts.
     */
    async #readVendor(kind: HarnessKind, signal?: AbortSignal): Promise<SubscriptionAllowance> {
        const at = this.#now();
        let allowance: SubscriptionAllowance;
        try {
            allowance = allowanceFromReading(
                await this.#read(kind, signal),
                new Date(at).toISOString()
            );
        } catch (error) {
            allowance =
                this.#cached.get(kind)?.allowance ??
                unreadableAllowance(kind, error, new Date(at).toISOString());
        }

        this.#cached.set(kind, { allowance, at });
        return allowance;
    }
}
