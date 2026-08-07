import { cancel, log, outro } from "@clack/prompts";

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
