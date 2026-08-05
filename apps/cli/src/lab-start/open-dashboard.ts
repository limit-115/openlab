import { isTTY } from "@clack/prompts";
import open from "open";
import type { OpenDashboardOptions } from "#src/lab-start/open-dashboard.types";

/**
 * Puts the lab in front of the operator who just started it, which is most of what one command
 * promises.
 *
 * A terminal nobody is watching is left alone: a lab brought up by a service manager or a CI run
 * has no one to show anything to. Neither has a machine with no browser to open, and neither is a
 * reason to stop a lab that is already running and answering, so this reports what happened rather
 * than raising it.
 */
export async function openDashboard(
    url: string,
    options: OpenDashboardOptions = {}
): Promise<boolean> {
    if (!(options.interactive ?? isTTY(process.stdout))) {
        return false;
    }

    try {
        await (options.browser ?? open)(url);
        return true;
    } catch {
        return false;
    }
}
