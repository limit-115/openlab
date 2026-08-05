#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cancel, confirm, intro, isCancel, isTTY, note, outro, text } from "@clack/prompts";
import { DaemonLogLevel } from "@openlab/daemon/daemon-runtime/daemon-config.const";
import { planPurge, purgeRuns } from "@openlab/daemon/run-purge/run-purge";
import { startDaemon } from "@openlab/daemon/server";
import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { InvestigationRequestSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationRequest } from "@openlab/protocol/investigation-input/investigation-input.types";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { Command, InvalidArgumentError } from "commander";
import { consola } from "consola";
import { LabApiClient, LabApiError } from "#src/api-client";
import { resolveCliConfig } from "#src/config";
import { harnessKindList, parseHarnessKinds } from "#src/harness-selection";
import { installLab } from "#src/lab-installation/install-lab";
import { reportInstallation } from "#src/lab-installation/installation-report";
import { installedPaths } from "#src/lab-installation/installed-layout";
import {
    renderInstallationReport,
    renderInstallOutcome,
    renderUninstallOutcome
} from "#src/lab-installation/render-installation";
import { uninstallLab } from "#src/lab-installation/uninstall-lab";
import { openDashboard } from "#src/lab-start/open-dashboard";
import { reportStartupToTerminal } from "#src/lab-start/startup-checklist";
import {
    renderAssumptions,
    renderCapabilities,
    renderInvestigations,
    renderStatus
} from "#src/render";
import { resolvePurgeConfig } from "#src/run-purge/purge-config";

interface GlobalOptions {
    apiUrl: string;
    json?: boolean;
    investigation?: string;
}

interface StartOptions {
    port?: number;
    open?: boolean;
    verbose?: boolean;
}

interface InstallOptions {
    modifyPath?: boolean;
}

/** What this build of the lab is, which is both what `--version` answers and what installs itself. */
const LAB_VERSION = "0.1.0";

interface NewOptions {
    goal?: string;
    context?: string[];
    criteria?: string[];
    harness?: readonly AgentHarnessKind[];
    file?: string;
}

const ShutdownSignal = {
    INTERRUPT: "SIGINT",
    TERMINATE: "SIGTERM"
} as const;

const ShutdownExitCode = {
    [ShutdownSignal.INTERRUPT]: 130,
    [ShutdownSignal.TERMINATE]: 143
} as const;

const cliConfig = resolveCliConfig();

function parsePort(value: string): number {
    const port = Number.parseInt(value, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new InvalidArgumentError("Port must be between 1 and 65535");
    }
    return port;
}

function collect(value: string, previous: string[] | undefined): string[] {
    return [...(previous ?? []), value];
}

function globals(command: Command): GlobalOptions {
    return command.optsWithGlobals<GlobalOptions>();
}

function print(value: unknown, json: boolean | undefined, renderer?: () => string): void {
    if (json || renderer === undefined) {
        process.stdout.write(`${JSON.stringify(value, null, 4)}\n`);
        return;
    }
    process.stdout.write(`${renderer()}\n`);
}

function client(command: Command): LabApiClient {
    return new LabApiClient(globals(command).apiUrl);
}

/**
 * Which investigation a command is about. Naming one settles it; with none named, a lab holding a
 * single investigation is unambiguous, and a lab holding several has to be told which.
 */
async function selectInvestigation(command: Command): Promise<string> {
    const named = globals(command).investigation;
    if (named !== undefined) {
        return named;
    }
    const roster = await client(command).investigations();
    const only = roster[0];
    if (only === undefined) {
        throw new LabApiError(
            'The lab holds no investigations. Start one with "openlab new".',
            0,
            undefined
        );
    }
    if (roster.length > 1) {
        throw new LabApiError(
            `The lab holds ${roster.length} investigations. Name one with --investigation:\n${roster
                .map(({ id, goal }) => `  ${id}  ${goal}`)
                .join("\n")}`,
            0,
            undefined
        );
    }
    return only.id;
}

/** Anything answering on the daemon URL still owns the run directories, so a purge would race it. */
async function daemonIsAnswering(command: Command): Promise<boolean> {
    try {
        await client(command).investigations();
        return true;
    } catch (error) {
        return !(error instanceof LabApiError && error.status === 0);
    }
}

const program = new Command()
    .name("openlab")
    .description("Run and inspect NightLab, your local autonomous research lab")
    .version(LAB_VERSION)
    .option("--api-url <url>", "local daemon URL", cliConfig.apiUrl)
    .option("-i, --investigation <id>", "which investigation the command is about")
    .option("--json", "print machine-readable JSON")
    .showSuggestionAfterError()
    .showHelpAfterError();

program
    .command("start")
    .description("bring the lab up: the daemon, its dashboard and every investigation it holds")
    .option("-p, --port <port>", "status API port", parsePort)
    .option("--no-open", "leave the browser alone")
    .option("--verbose", "write what every request did, not only what went wrong")
    .action(async (options: StartOptions) => {
        intro("NightLab");
        const daemon = await startDaemon(
            {
                ...(options.port === undefined ? {} : { port: options.port }),
                ...(options.verbose === true ? { logLevel: DaemonLogLevel.INFO } : {})
            },
            { reportStartup: reportStartupToTerminal }
        );
        let closing = false;
        for (const signal of Object.values(ShutdownSignal)) {
            process.once(signal, async () => {
                if (closing) {
                    return;
                }
                closing = true;
                process.exitCode = ShutdownExitCode[signal];
                await daemon.close();
            });
        }
        const shown = options.open === false ? false : await openDashboard(daemon.url);
        outro(
            shown
                ? `Lab running at ${daemon.url}, opened in your browser`
                : `Lab running at ${daemon.url}`
        );
    });

program
    .command("install")
    .description("install the release this executable came from, and put it on your PATH")
    .option("--no-modify-path", "leave your shell startup files alone")
    .action(async (options: InstallOptions) => {
        const outcome = await installLab({
            from: dirname(process.execPath),
            version: LAB_VERSION,
            paths: installedPaths(LAB_VERSION),
            modifyPath: options.modifyPath !== false
        });
        process.stdout.write(`${renderInstallOutcome(outcome)}\n`);
    });

program
    .command("uninstall")
    .description("take the program back out, leaving your lab where it is")
    .action(async () => {
        const paths = installedPaths(LAB_VERSION);
        const outcome = await uninstallLab(paths.home, resolvePurgeConfig().workspaceRoot);
        process.stdout.write(`${renderUninstallOutcome(outcome)}\n`);
    });

program
    .command("doctor")
    .description("show what is installed, what answers, and what the lab still needs")
    .action(async (_options, command: Command) => {
        const version = LAB_VERSION;
        const report = await reportInstallation(
            version,
            installedPaths(version),
            resolvePurgeConfig().workspaceRoot
        );
        print(report, globals(command).json, () => renderInstallationReport(report));
    });

program
    .command("new")
    .description("start an investigation on a goal")
    .option("-g, --goal <goal>", "what the investigation is chasing")
    .option("-c, --context <item>", "something the agents should know (repeatable)", collect)
    .option("-s, --criteria <item>", "what would count as success (repeatable)", collect)
    .option(
        "--harness <kinds>",
        `rotate through only these harnesses, comma separated (${harnessKindList()})`,
        parseHarnessKinds
    )
    .option("-f, --file <path>", "read the goal and its options from a JSON file")
    .action(async (options: NewOptions, command: Command) => {
        const snapshot = await client(command).create(await resolveInvestigationRequest(options));
        consola.success(
            `Investigation ${snapshot.investigation.id} is ${snapshot.investigation.state}`
        );
    });

program
    .command("list")
    .description("show every investigation the lab is holding")
    .action(async (_options, command: Command) => {
        const roster = await client(command).investigations();
        print(roster, globals(command).json, () => renderInvestigations(roster));
    });

program
    .command("status")
    .description("show current investigation state")
    .action(async (_options, command: Command) => {
        const status = await client(command).status(await selectInvestigation(command));
        print(status, globals(command).json, () => renderStatus(status));
    });

program
    .command("bets")
    .description("show where the director thinks the goal might be reachable")
    .action(async (_options, command: Command) => {
        const assumptions = await client(command).assumptions(await selectInvestigation(command));
        print(assumptions, globals(command).json, () => renderAssumptions(assumptions));
    });

program
    .command("inspect")
    .description("inspect a bet, finding, verdict, or run")
    .argument("<id>")
    .action(async (id: string, _options, command: Command) => {
        print(await client(command).inspect(await selectInvestigation(command), id), true);
    });

program
    .command("capabilities")
    .description("list capability requests")
    .action(async (_options, command: Command) => {
        const requests = await client(command).capabilities(await selectInvestigation(command));
        print(requests, globals(command).json, () => renderCapabilities(requests));
    });

program
    .command("answer")
    .description("answer a capability request in your own words")
    .argument("<request-id>")
    .argument("<answer>")
    .action(async (id: string, answer: string, _options, command: Command) => {
        await client(command).answer(await selectInvestigation(command), id, answer);
        consola.success(`Capability ${id} answered`);
    });

program
    .command("wake")
    .description("put a hibernating, breakthrough or stopped investigation back to work")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).wake(
            await selectInvestigation(command)
        );
        consola.success(`Investigation is ${status.investigation.state}`);
    });

program
    .command("stop")
    .description("stop a running investigation")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).stop(
            await selectInvestigation(command)
        );
        consola.success(`Investigation is ${status.investigation.state}`);
    });

program
    .command("export")
    .description("show the durable run export")
    .action(async (_options, command: Command) => {
        const exported = await client(command).exportRun(await selectInvestigation(command));
        print(exported, globals(command).json, () => exported.run_directory);
    });

program
    .command("rm")
    .description("discard one investigation, its history and its run directory")
    .argument("<id>")
    .action(async (id: string, _options, command: Command) => {
        await client(command).remove(id);
        consola.success(`Investigation ${id} discarded`);
    });

program
    .command("purge")
    .description("delete every investigation from disk and the database")
    .action(async (_options, command: Command) => {
        if (!isTTY(process.stdout)) {
            consola.error("purge asks before deleting and needs an interactive terminal");
            process.exitCode = 1;
            return;
        }
        if (await daemonIsAnswering(command)) {
            consola.error(
                `A lab daemon is answering at ${globals(command).apiUrl}. Stop it first, or discard a single investigation with "openlab rm".`
            );
            process.exitCode = 1;
            return;
        }
        const config = resolvePurgeConfig();

        intro("Purge every investigation");
        const plan = await planPurge(config);
        if (plan.investigationIds.length === 0) {
            outro("The lab holds nothing to purge");
            return;
        }
        note(
            plan.investigationIds.join("\n"),
            `Deleting ${plan.investigationIds.length} investigation(s) from disk and the database`
        );

        const confirmed = await confirm({
            message: "This cannot be undone. Continue?",
            initialValue: false
        });
        if (isCancel(confirmed) || !confirmed) {
            cancel("Purge cancelled");
            process.exitCode = 1;
            return;
        }

        const result = await purgeRuns(config);
        outro(
            `Purged ${result.purgedDirectoryCount} run director${result.purgedDirectoryCount === 1 ? "y" : "ies"} and ${result.purgedInvestigationRowCount} investigation row(s)`
        );
    });

/** The goal and its options, from the flags, from a file, or asked for outright. */
async function resolveInvestigationRequest(options: NewOptions): Promise<InvestigationRequest> {
    if (options.file !== undefined) {
        const source = await readFile(resolve(options.file), "utf8");
        return InvestigationRequestSchema.parse(JSON.parse(source));
    }
    let goal = options.goal;
    if (goal === undefined) {
        intro("New investigation");
        const answer = await text({
            message: "What should the lab find out?",
            placeholder: "Find a faster algorithm for …",
            validate: (value) => ((value?.trim().length ?? 0) === 0 ? "Enter a goal" : undefined)
        });
        if (isCancel(answer)) {
            cancel("Cancelled");
            process.exit(1);
        }
        goal = answer;
    }
    return InvestigationRequestSchema.parse({
        goal,
        ...(options.context === undefined ? {} : { context: options.context }),
        ...(options.criteria === undefined ? {} : { success_criteria: options.criteria }),
        ...(options.harness === undefined ? {} : { harness_kinds: options.harness })
    });
}

try {
    await program.parseAsync();
} catch (error) {
    if (error instanceof LabApiError) {
        consola.error(error.message);
        process.exitCode = 1;
    } else {
        throw error;
    }
}
