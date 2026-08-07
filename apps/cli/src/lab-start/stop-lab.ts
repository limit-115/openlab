import { cancel, isTTY, log, outro } from "@clack/prompts";
import {
    CONFIRM_STOP_WITHIN_MS,
    FORCED_STOP_EXIT_CODE,
    QUIT_OFFER_AFTER_MS,
    SAME_PRESS_WITHIN_MS,
    ShutdownSignal
} from "#src/lab-start/stop-lab.const";
import type { StopLabOptions } from "#src/lab-start/stop-lab.types";

/**
 * Puts a running lab under the signals that stop it.
 *
 * Ctrl+C at a terminal somebody is watching asks first. What it takes down is hours of agents at
 * work, so a key pressed by mistake, or meant for whatever the operator thought was in front of
 * them, costs a research run — and the press that answers the question is the one that meant it.
 * The question lapses on its own, because a lab still up an hour later is a lab meant to be up, and
 * an old press is no part of the answer. Nothing else is asked: a service manager sending its
 * signal cannot answer, and neither can a terminal nobody is reading, so both take the lab down at
 * the first word.
 *
 * The interrupt a script runner forwards is what makes any of this delicate. Ctrl+C reaches a lab
 * started through one twice, once from the terminal and once forwarded, and the copy landing
 * milliseconds later would answer the question the original just asked — so a repeat that close is
 * read as the one press it is.
 *
 * Once the lab is going down the repeats are held instead, because a stop that let the forwarded
 * signal through to Node would be killed halfway rather than finished. A stop that drags is the
 * last case: the operator is waiting on agents being let go, and once they have waited, pressing
 * again means it — so the way out is offered, again no sooner than a forwarded signal could arrive.
 * Taking it abandons a stop half done, which is an interrupted process rather than a stopped lab,
 * and it ends as one.
 */
export function stopLabOnSignal(close: () => Promise<void>, options: StopLabOptions = {}): void {
    const quit = options.quit ?? ((code: number) => process.exit(code));
    const watched = options.interactive ?? isTTY(process.stdout);
    const samePressWithinMs = options.samePressWithinMs ?? SAME_PRESS_WITHIN_MS;
    const confirmWithinMs = options.confirmWithinMs ?? CONFIRM_STOP_WITHIN_MS;
    let stopping = false;
    let offered = false;
    /** When the question on screen was put, for as long as it is the question on screen. */
    let askedAt: number | undefined;

    const beginStop = () => {
        stopping = true;
        const offer = setTimeout(() => {
            offered = true;
            if (watched) {
                log.warn("Still stopping. Press Ctrl+C again to quit without waiting");
            }
        }, options.quitOfferAfterMs ?? QUIT_OFFER_AFTER_MS);
        /** A lab already down is not kept up by the offer it never had to make. */
        offer.unref();
        void stopLab(close).finally(() => clearTimeout(offer));
    };

    const onSignal = (signal: ShutdownSignal) => {
        if (stopping) {
            if (offered) {
                cancel("Quit. The lab was still stopping");
                quit(FORCED_STOP_EXIT_CODE);
            }
            return;
        }
        if (signal !== ShutdownSignal.INTERRUPT || !watched) {
            beginStop();
            return;
        }
        const since = askedAt === undefined ? undefined : Date.now() - askedAt;
        if (since !== undefined && since < samePressWithinMs) {
            return;
        }
        if (since !== undefined && since <= confirmWithinMs) {
            beginStop();
            return;
        }
        askedAt = Date.now();
        log.warn("Press Ctrl+C again to stop the lab — the agents it is running go with it");
    };

    for (const signal of Object.values(ShutdownSignal)) {
        process.on(signal, () => onSignal(signal));
    }
}

/**
 * Taking the lab down the way the operator asked for. The terminal hears that the lab is going
 * before it goes and hears when it is down, and the command ends the way it was meant to: a lab
 * stopped on purpose is not a failed command, and everything that runs one — a shell, pnpm, a
 * service manager — reads the exit code rather than the goodbye.
 *
 * Letting the agents go takes as long as they take to be let go, which is why the wait is said out
 * loud: a terminal that went quiet is a lab that looks hung.
 */
export async function stopLab(close: () => Promise<void>): Promise<void> {
    log.info("Stopping the lab, letting its agents go");
    try {
        await close();
    } catch (error) {
        process.exitCode = 1;
        cancel(
            `The lab did not stop cleanly: ${error instanceof Error ? error.message : String(error)}`
        );
        return;
    }
    outro("Lab stopped. See you soon");
}
