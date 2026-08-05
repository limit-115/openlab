import type { InstallOutcome } from "#src/lab-installation/install-lab";
import type { InstallationReport } from "#src/lab-installation/installation-report";
import type { UninstallOutcome } from "#src/lab-installation/uninstall-lab";

/**
 * What an operator is told after an install.
 *
 * The one thing they need next differs by case, so it is stated rather than implied: a shell that
 * already reaches the launcher can run the lab now, and one that does not has to be reopened first.
 */
export function renderInstallOutcome(outcome: InstallOutcome): string {
    const lines = [
        `NightLab ${outcome.version} installed`,
        `  program   ${outcome.versionDirectory}`,
        `  command   ${outcome.launcher}`
    ];

    if (outcome.alreadyOnPath) {
        lines.push("", "Run it with: openlab start");
        return lines.join("\n");
    }

    if (outcome.pathFiles.length > 0) {
        lines.push(
            "",
            `Put on PATH in ${outcome.pathFiles.join(", ")}.`,
            "Open a new terminal, then run: openlab start"
        );
        return lines.join("\n");
    }

    lines.push("", "PATH was left alone. Run it with:", `  ${outcome.launcher} start`);
    return lines.join("\n");
}

/** What `doctor` prints: what is installed, what answers, and what the lab still needs. */
export function renderInstallationReport(report: InstallationReport): string {
    const lines = [
        "Installation",
        `  running     ${report.runningVersion}`,
        `  installed   ${report.installedVersion ?? "nothing — this lab was not installed"}`
    ];

    if (report.versionDirectory !== undefined) {
        lines.push(`  program     ${report.versionDirectory}`);
    }
    if (report.launcher !== undefined) {
        lines.push(`  command     ${report.launcher}`);
    }
    lines.push(
        `  on PATH     ${report.launcherOnPath ? "yes" : `no — ${report.binDirectory} is not on PATH`}`,
        `  lab home    ${report.labHome}`,
        "",
        "Harnesses"
    );

    for (const harness of report.harnesses) {
        lines.push(
            `  ${harness.kind.padEnd(10)}${harness.found ?? `not found — no ${harness.command} on PATH`}`
        );
    }

    if (report.harnesses.every((harness) => harness.found === undefined)) {
        lines.push(
            "",
            "The lab dispatches every agent to one of these CLIs and cannot research without one.",
            "Install one and authenticate it with your own subscription."
        );
    }

    return lines.join("\n");
}

/** What an uninstall took, and the one thing it deliberately did not. */
export function renderUninstallOutcome(outcome: UninstallOutcome): string {
    if (!outcome.wasInstalled) {
        return "Nothing to uninstall: no NightLab installation was recorded here.";
    }

    const lines = [
        "NightLab uninstalled",
        ...outcome.removed.map((entry) => `  removed   ${entry}`)
    ];
    for (const file of outcome.pathFilesCleared) {
        lines.push(`  cleared   PATH entry in ${file}`);
    }

    if (outcome.labHome !== undefined) {
        lines.push(
            "",
            `Your lab is untouched at ${outcome.labHome}`,
            "Delete that directory to be rid of its investigations, database and runs."
        );
    }
    return lines.join("\n");
}
