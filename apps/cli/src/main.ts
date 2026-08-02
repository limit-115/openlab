#!/usr/bin/env node
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import { startDaemon } from "@lab/daemon/server";
import type { StatusSnapshot } from "@lab/protocol/status";
import { Command, InvalidArgumentError } from "commander";
import { consola } from "consola";
import { LabApiClient, LabApiError } from "#src/api-client";
import { renderCapabilities, renderFrontier, renderStatus } from "#src/render";

interface GlobalOptions {
    apiUrl: string;
    json?: boolean;
}

const ShutdownSignal = {
    INTERRUPT: "SIGINT",
    TERMINATE: "SIGTERM"
} as const;

const ShutdownExitCode = {
    [ShutdownSignal.INTERRUPT]: 130,
    [ShutdownSignal.TERMINATE]: 143
} as const;

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

const program = new Command()
    .name("lab")
    .description("Run and inspect the local autonomous AI research lab")
    .version("0.1.0")
    .option(
        "--api-url <url>",
        "local daemon URL",
        process.env.LAB_API_URL ?? "http://127.0.0.1:4318"
    )
    .option("--json", "print machine-readable JSON")
    .showSuggestionAfterError()
    .showHelpAfterError();

program
    .command("start")
    .description("start an autonomous run from task.json")
    .argument("[task]", "path to task JSON")
    .option("-p, --port <port>", "status API port", parsePort)
    .action(async (task: string | undefined, options: { port?: number }) => {
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
            ...(options.port === undefined ? {} : { port: options.port })
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
        outro(`Running ${daemon.workspace.labId} at ${daemon.url}`);
    });

program
    .command("status")
    .description("show current lab state")
    .action(async (_options, command: Command) => {
        const status = await client(command).status();
        print(status, globals(command).json, () => renderStatus(status));
    });

program
    .command("frontier")
    .description("show the current research frontier")
    .action(async (_options, command: Command) => {
        const frontier = await client(command).frontier();
        print(frontier, globals(command).json, () => renderFrontier(frontier));
    });

program
    .command("inspect")
    .description("inspect a claim, experiment, task, or branch")
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
    .command("provide")
    .description("attach a resource reference to a capability request")
    .argument("<request-id>")
    .argument("<resource-reference>")
    .action(async (id: string, resourceReference: string, _options, command: Command) => {
        await client(command).provide(id, resourceReference);
        consola.success(`Capability ${id} provided`);
    });

program
    .command("wake")
    .description("wake a hibernating lab")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).wake();
        consola.success(`Lab is ${status.lab.state}`);
    });

program
    .command("stop")
    .description("stop the running lab")
    .action(async (_options, command: Command) => {
        const status: StatusSnapshot = await client(command).stop();
        consola.success(`Lab is ${status.lab.state}`);
    });

program
    .command("export")
    .description("show the durable run export")
    .action(async (_options, command: Command) => {
        const exported = await client(command).exportRun();
        print(exported, globals(command).json, () => exported.run_directory);
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
