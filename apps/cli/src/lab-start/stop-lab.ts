import { cancel, isTTY, log, outro } from "@clack/prompts";
import {
    FORCED_STOP_EXIT_CODE,
    QUIT_OFFER_AFTER_MS,
    ShutdownSignal
} from "#src/lab-start/stop-lab.const";
import type { StopLabOptions } from "#src/lab-start/stop-lab.types";

/**
 * Puts a running lab under the signals that stop it.
 *
 * The first one stops it and the ones behind it are the same request arriving again: Ctrl+C reaches
 * a lab started through a script runner twice, once from the terminal and once forwarded by the
 * runner, and a stop that let the forwarded one through to Node would be killed halfway rather than
 * finished. So a stop that is getting on with it holds every repeat.
 *
 * A stop that drags is the other case. The operator is waiting on agents being let go, and once
 * they have waited, pressing again means it — so the way out is offered, but only after long enough
 * that no forwarded signal could be mistaken for it. Taking it abandons a stop half done, which is
 * an interrupted process rather than a stopped lab, and it ends as one.
 */
export function stopLabOnSignal(close: () => Promise<void>, options: StopLabOptions = {}): void {
    const quit = options.quit ?? ((code: number) => process.exit(code));
    let stopping = false;
    let offered = false;

    const onSignal = () => {
        if (stopping) {
            if (offered) {
                cancel("Quit. The lab was still stopping");
                quit(FORCED_STOP_EXIT_CODE);
            }
            return;
        }
        stopping = true;
        const offer = setTimeout(() => {
            offered = true;
            if (options.interactive ?? isTTY(process.stdout)) {
                log.warn("Still stopping. Press Ctrl+C again to quit without waiting");
            }
        }, options.quitOfferAfterMs ?? QUIT_OFFER_AFTER_MS);
        /** A lab already down is not kept up by the offer it never had to make. */
        offer.unref();
        void stopLab(close).finally(() => clearTimeout(offer));
    };

    for (const signal of Object.values(ShutdownSignal)) {
        process.on(signal, onSignal);
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
