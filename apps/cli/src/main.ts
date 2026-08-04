#!/usr/bin/env node
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { cancel, confirm, intro, isCancel, isTTY, note, outro, select, text } from "@clack/prompts";
import { planPurge, purgeRuns } from "@lab/daemon/run-purge/run-purge";
import { PurgeScope } from "@lab/daemon/run-purge/run-purge.const";
import { startDaemon } from "@lab/daemon/server";
import type { HarnessKind } from "@lab/harness/agent-harness.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { Command, InvalidArgumentError } from "commander";
import { consola } from "consola";
import { LabApiClient, LabApiError } from "#src/api-client";
import { resolveCliConfig } from "#src/config";
import { harnessKindList, parseHarnessKinds } from "#src/harness-selection";
import { renderAssumptions, renderCapabilities, renderStatus } from "#src/render";
import { resolvePurgeConfig } from "#src/run-purge/purge-config";

interface GlobalOptions {
    apiUrl: string;
    json?: boolean;
}

interface StartOptions {
    port?: number;
    harness?: readonly HarnessKind[];
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
 * Anything that answers on the daemon URL still owns the run directories, so a purge would delete
 * state out from under it. Only an unreachable daemon clears the way.
 */
async function daemonIsAnswering(command: Command): Promise<boolean> {
    try {
        await client(command).status();
        return true;
    } catch (error) {
        return !(error instanceof LabApiError && error.status === 0);
    }
}

const program = new Command()
    .name("lab")
    .description("Run and inspect the local autonomous AI research lab")
    .version("0.1.0")
    .option("--api-url <url>", "local daemon URL", cliConfig.apiUrl)
    .option("--json", "print machine-readable JSON")
    .showSuggestionAfterError()
    .showHelpAfterError();

program
    .command("start")
    .description("start an autonomous run from task.json")
    .argument("[task]", "path to task JSON")
    .option("-p, --port <port>", "status API port", parsePort)
    .option(
        "--harness <kinds>",
        `rotate through only these harnesses, comma separated (${harnessKindList()})`,
        parseHarnessKinds
    )
    .action(async (task: string | undefined, options: StartOptions) => {
        intro("AI Research Lab");
        let selectedTask = task;
        if (selectedTask === undefined) {
            const answer = await text({
                message: "Task JSON path",
                placeholder: "./task.json",
                defaultValue: "./task.json",
                validate: (value) =>
                    (value?.trim().length ?? 0) === 0 ? "Enter a path" : undefined
            });
            if (isCancel(answer)) {
                cancel("Start cancelled");
                process.exitCode = 1;
                return;
            }
            selectedTask = answer;
        }
        const taskPath = resolve(selectedTask);
        await access(taskPath);
        const daemon = await startDaemon({
            taskPath,
            ...(options.port === undefined ? {} : { port: options.port }),
            ...(options.harness === undefined ? {} : { harnessKinds: options.harness })
        });
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
        outro(`Running ${daemon.workspace.investigationId} at ${daemon.url}`);
    });

program
    .command("status")
    .description("show current investigation state")
    .action(async (_options, command: Command) => {
        const status = await client(command).status();
        print(status, globals(command).json, () => renderStatus(status));
    });

program
    .command("bets")
    .description("show where the director thinks the goal might be reachable")
    .action(async (_options, command: Command) => {
        const assumptions = await client(command).assumptions();
        print(assumptions, globals(command).json, () => renderAssumptions(assumptions));
    });

program
    .command("inspect")
    .description("inspect a bet, finding, verdict, or run")
    .argument("<id>")
    .action(async (id: string, _options, command: Command) => {
        print(await client(command).inspect(id), true);
    });

program
    .command("capabilities")
    .description("list capability requests")
    .action(async (_options, command: Command) => {
        const requests = await client(command).capabilities();
        print(requests, globals(command).json, () => renderCapabilities(requests));
    });

program
    .command("answer")
    .description("answer a capability request in your own words")
    .argument("<request-id>")
    .argument("<answer>")
    .action(async (id: string, answer: string, _options, command: Command) => {
        await client(command).answer(id, answer);
        consola.success(`Capability ${id} answered`);
    });

program
    .command("wake")
    .description("put a hibernating, breakthrough or stopped investigation back to work")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).wake();
        consola.success(`Investigation is ${status.investigation.state}`);
    });

program
    .command("stop")
    .description("stop the running investigation")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).stop();
        consola.success(`Investigation is ${status.investigation.state}`);
    });

program
    .command("export")
    .description("show the durable run export")
    .action(async (_options, command: Command) => {
        const exported = await client(command).exportRun();
        print(exported, globals(command).json, () => exported.run_directory);
    });

program
    .command("purge")
    .description("delete run history from disk and the database")
    .action(async (_options, command: Command) => {
        if (!isTTY(process.stdout)) {
            consola.error("purge asks before deleting and needs an interactive terminal");
            process.exitCode = 1;
            return;
        }
        if (await daemonIsAnswering(command)) {
            consola.error(
                `A lab daemon is answering at ${globals(command).apiUrl}. Run "lab stop" first.`
            );
            process.exitCode = 1;
            return;
        }
        let config: ReturnType<typeof resolvePurgeConfig>;
        try {
            config = resolvePurgeConfig();
        } catch {
            consola.error("purge needs DATABASE_URL to reach the lab database");
            process.exitCode = 1;
            return;
        }

        intro("Purge run history");
        const plan = await planPurge(config);
        if (plan.investigationIds.length === 0) {
            outro("No run history to purge");
            return;
        }

        const scope =
            plan.currentInvestigationId === undefined
                ? PurgeScope.ALL
                : await select({
                      message: "What should be purged?",
                      initialValue: PurgeScope.EXCEPT_CURRENT,
                      options: [
                          {
                              value: PurgeScope.EXCEPT_CURRENT,
                              label: "All runs except the current one",
                              hint: `keeps ${plan.currentInvestigationId}`
                          },
                          {
                              value: PurgeScope.ALL,
                              label: "All runs",
                              hint: "including the current one"
                          }
                      ]
                  });
        if (isCancel(scope)) {
            cancel("Purge cancelled");
            process.exitCode = 1;
            return;
        }

        const doomed =
            scope === PurgeScope.ALL
                ? plan.investigationIds
                : plan.investigationIds.filter(
                      (investigationId) => investigationId !== plan.currentInvestigationId
                  );
        if (doomed.length === 0) {
            outro("Nothing to purge besides the current run");
            return;
        }
        note(doomed.join("\n"), `Deleting ${doomed.length} run(s) from disk and the database`);

        const confirmed = await confirm({
            message: "This cannot be undone. Continue?",
            initialValue: false
        });
        if (isCancel(confirmed) || !confirmed) {
            cancel("Purge cancelled");
            process.exitCode = 1;
            return;
        }

        const result = await purgeRuns({ ...config, scope });
        outro(
            `Purged ${result.purgedDirectoryCount} run director${result.purgedDirectoryCount === 1 ? "y" : "ies"} and ${result.purgedInvestigationRowCount} investigation row(s)`
        );
    });

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
