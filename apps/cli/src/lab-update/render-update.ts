import { INSTALL_COMMAND } from "#src/lab-update/release-channel.const";
import { UpdateResult } from "#src/lab-update/update-lab.const";
import type { UpdateOutcome } from "#src/lab-update/update-lab.types";

/**
 * What an operator is told an update came to.
 *
 * Every outcome ends in the one thing there is left to do, stated as the command that does it. A
 * lab that was never installed cannot be updated and has to be installed; a lab ahead of what is
 * published was left alone and can be moved back by naming the version; a lab that was updated
 * while it was running is answering out of the release it started on until it is restarted.
 */
export function renderUpdateOutcome(outcome: UpdateOutcome, labIsRunning: boolean): string {
    switch (outcome.result) {
        case UpdateResult.NOT_INSTALLED:
            return [
                'This lab was not installed by "openlab install", so there is nothing here to replace.',
                "",
                "Install it with:",
                `    ${INSTALL_COMMAND}`
            ].join("\n");

        case UpdateResult.ALREADY_CURRENT:
            return `OpenLab ${outcome.runningVersion} is the current release.`;

        case UpdateResult.AHEAD_OF_CHANNEL:
            return [
                `You are running OpenLab ${outcome.runningVersion}, and the current release is ${outcome.offeredVersion}.`,
                "",
                "Nothing was changed. Install the published release with:",
                `    openlab update ${outcome.offeredVersion}`
            ].join("\n");

        case UpdateResult.AVAILABLE:
            return [
                `OpenLab ${outcome.offeredVersion} is available. You are running ${outcome.runningVersion}.`,
                "",
                `What changed  ${outcome.notesUrl}`,
                "",
                "Install it with:",
                "    openlab update"
            ].join("\n");

        case UpdateResult.UPDATED:
            return renderInstalledUpdate(outcome, labIsRunning);
    }
}

function renderInstalledUpdate(outcome: UpdateOutcome, labIsRunning: boolean): string {
    const lines = [
        `OpenLab ${outcome.offeredVersion} installed`,
        `  program   ${outcome.versionDirectory}`,
        `  replaced  ${outcome.runningVersion}`
    ];

    if (outcome.retired.length > 0) {
        lines.push(`  retired   ${outcome.retired.join(", ")}`);
    }
    if (outcome.fromDisk) {
        lines.push("", "That release was still on disk, so nothing was downloaded.");
    }
    lines.push("", `What changed  ${outcome.notesUrl}`);

    if (labIsRunning) {
        lines.push(
            "",
            `A lab is running and answers out of ${outcome.runningVersion} until it is restarted.`,
            "Stop it with Ctrl+C, then run: openlab start"
        );
    }
    return lines.join("\n");
}
