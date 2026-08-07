import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessInputSources,
    HarnessKinds,
    HarnessRunStatuses
} from "#src/agent-harness/agent-harness.const";
import { HarnessDiagnosticLevels, HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { HarnessCapabilityError, HarnessRequestError } from "#src/cli-execution/harness-error";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";
import { museCredentialPath } from "#src/muse-cli/muse-account";
import type { MuseAccount } from "#src/muse-cli/muse-account.types";
import {
    MUSE_BASE_URL,
    MUSE_NO_AUTO_UPDATE_VARIABLE,
    MuseAuthMechanisms,
    MuseModels,
    MuseSessionDefaults
} from "#src/muse-cli/muse-cli.const";
import { MuseTestValues, museRecord, museRunStream } from "#src/muse-cli/muse-cli.fixture";
import { MuseHarness } from "#src/muse-cli/muse-harness";
import {
    answerSchema,
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/subscription-cli-harness/harness-run.fixture";

const MuseTestAccount: MuseAccount = {
    email: MuseTestValues.EMAIL,
    mechanism: MuseAuthMechanisms.OAUTH,
    baseUrl: MUSE_BASE_URL
} as const;

/** The preflight asks the binary for its version twice: once for the record, once for liveness. */
function museRunner(
    events: readonly Readonly<Record<string, unknown>>[] = museRunStream("done")
): FakeHarnessProcessRunner {
    const runner = new FakeHarnessProcessRunner([
        captureSuccess(MuseTestValues.VERSION),
        captureSuccess(MuseTestValues.VERSION)
    ]);
    runner.nextStream = streamSuccess(events);
    return runner;
}

function harness(
    runner: FakeHarnessProcessRunner,
    account: MuseAccount = MuseTestAccount,
    environment: NodeJS.ProcessEnv = testEnvironment()
): MuseHarness {
    return new MuseHarness({
        runner,
        environment,
        resolveAccount: async () => account
    });
}

afterEach(removeHarnessRunDirectories);

describe("MuseHarness", () => {
    /**
     * `muse exec` reads no stdin at all: a prompt written into one leaves the CLI exiting because it
     * was given no prompt. The file it is pointed at is the run's own prompt artifact, so the bytes
     * the model read are the bytes the manifest hashed rather than a second copy of them.
     */
    it("points the CLI at the prompt artifact and writes nothing into its stdin", async () => {
        const runner = museRunner();
        const muse = harness(runner);

        const events = await Array.fromAsync(muse.run(await harnessRequest("muse-prompt")));
        const completed = lastCompleted(events);
        const spawn = runner.spawnRequests[0];

        expect(spawn?.input).toBeUndefined();
        expect(spawn?.args).toEqual(
            expect.arrayContaining(["--prompt-file", completed.result.artifacts.prompt.path])
        );
        expect(completed.result.command.stdin).toBe(HarnessInputSources.PROMPT_FILE);
    });

    /**
     * Muse Code has no structured-output flag, so a structured run asks for the schema in words. The
     * artifact has to record the asking, or the hash beside the run describes text nobody sent.
     */
    it("records the schema instruction it actually sent, not the prompt it was given", async () => {
        const runner = museRunner(museRunStream(JSON.stringify({ answer: 7 })));
        const muse = harness(runner);
        const request = await harnessRequest("muse-structured", { responseSchema: answerSchema() });

        const events = await Array.fromAsync(muse.run(request));
        const completed = lastCompleted(events);
        const sentPrompt = await readFile(completed.result.artifacts.prompt.path, "utf8");

        expect(sentPrompt).toContain(request.prompt);
        expect(sentPrompt).toContain('"answer"');
        expect(completed.result.structuredOutput).toEqual({ answer: 7 });
    });

    it("fails a structured run the model answered in prose", async () => {
        const runner = museRunner(museRunStream("I could not work out an answer."));
        const muse = harness(runner);

        const events = await Array.fromAsync(
            muse.run(await harnessRequest("muse-prose", { responseSchema: answerSchema() }))
        );
        const completed = lastCompleted(events);

        expect(completed.result.status).toBe(HarnessRunStatuses.FAILED);
        expect(completed.result.error).toContain("structured output");
    });

    it("reads a fenced answer the model wrapped anyway", async () => {
        const fenced = `\`\`\`json\n${JSON.stringify({ answer: 3 })}\n\`\`\``;
        const runner = museRunner(museRunStream(fenced));
        const muse = harness(runner);

        const events = await Array.fromAsync(
            muse.run(await harnessRequest("muse-fenced", { responseSchema: answerSchema() }))
        );

        expect(lastCompleted(events).result.structuredOutput).toEqual({ answer: 3 });
    });

    /**
     * The tier is the model id, so inheriting a machine-local default is how a lab ends up handing
     * private research to a training tier without anyone choosing it.
     */
    it("runs the tier Meta does not train on when the request names no model", async () => {
        const runner = museRunner();
        const muse = harness(runner);

        await Array.fromAsync(muse.run(await harnessRequest("muse-default-model")));

        expect(runner.spawnRequests[0]?.args).toEqual(
            expect.arrayContaining(["--model", MuseModels.STANDARD])
        );
        expect(MuseSessionDefaults.MODEL).not.toBe(MuseModels.CONTRIBUTOR);
    });

    it("warns on the run itself when the model reports the training tier", async () => {
        const runner = museRunner(museRunStream("done", MuseModels.CONTRIBUTOR));
        const muse = harness(runner);

        const events = await Array.fromAsync(
            muse.run(await harnessRequest("muse-contributor"), undefined)
        );
        const warning = events.find(
            (event) =>
                event.type === HarnessEventTypes.DIAGNOSTIC &&
                event.level === HarnessDiagnosticLevels.WARNING
        );

        expect(warning).toBeDefined();
        expect(warning).toMatchObject({ message: expect.stringContaining("trains on") });
    });

    /**
     * `--base-url` would send the run to another host while every record the lab keeps still reads as
     * Muse, and a stray `META_API_KEY` would pay for it from an account the manifest cannot name.
     */
    it("keeps the run on Meta's own host and off any inherited credential", async () => {
        const runner = museRunner();
        const muse = harness(runner, MuseTestAccount, {
            ...testEnvironment(),
            META_API_KEY: "meta-secret",
            MUSE_AUTH_URL: "https://elsewhere.invalid"
        });

        const events = await Array.fromAsync(muse.run(await harnessRequest("muse-pinned")));
        const spawn = runner.spawnRequests[0];

        expect(spawn?.args).not.toContain("--base-url");
        expect(spawn?.environment).not.toHaveProperty("META_API_KEY");
        expect(spawn?.environment).not.toHaveProperty("MUSE_AUTH_URL");
        expect(spawn?.environment).toMatchObject({ [MUSE_NO_AUTO_UPDATE_VARIABLE]: "1" });
        expect(lastCompleted(events).result.command.removedEnvironmentVariables).toEqual(
            expect.arrayContaining(["META_API_KEY", "MUSE_AUTH_URL"])
        );
    });

    /**
     * The operator reads one stable sentence and a provisioning hint; what exactly was wrong with the
     * credential is carried underneath it, so a refusal can be acted on without being guessed at.
     */
    it("refuses a credential whose own host has moved off Meta", async () => {
        const muse = harness(museRunner(), {
            ...MuseTestAccount,
            baseUrl: "https://mirror.invalid/v1"
        });

        const error = await muse.preflight().catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(HarnessCapabilityError);
        expect((error as HarnessCapabilityError).cause).toMatchObject({
            message: expect.stringContaining("mirror.invalid")
        });
    });

    /**
     * The preflight reads a file the CLI will read again for itself. A daemon started from one
     * account's shell, or a run given a home of its own, makes those two different files — and then
     * the manifest names one account while the process spends another.
     */
    it("looks for the credential where the CLI will look, not where this process lives", () => {
        expect(museCredentialPath({ HOME: "/somewhere/else" })).toBe(
            join("/somewhere/else", ".config", "muse", "auth.json")
        );
    });

    /** A trimmed path is a different path, and the CLI does not trim it. */
    it("takes a config home as it was set, and only reads whitespace to see if it says anything", () => {
        expect(museCredentialPath({ XDG_CONFIG_HOME: "/spaced dir " })).toBe(
            join("/spaced dir ", "muse", "auth.json")
        );
        expect(museCredentialPath({ XDG_CONFIG_HOME: "   ", HOME: "/fallback" })).toBe(
            join("/fallback", ".config", "muse", "auth.json")
        );
    });

    /** A metered run has to name what it spends, and a login naming nobody fails that as surely
     * as a pasted key does. */
    it("refuses a login that names no account for Meta to bill", async () => {
        const muse = harness(museRunner(), { ...MuseTestAccount, email: null });

        const error = await muse.preflight().catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(HarnessCapabilityError);
        expect((error as HarnessCapabilityError).cause).toMatchObject({
            message: expect.stringContaining("names no account")
        });
    });

    it("refuses a pasted key in place of a Meta-account login", async () => {
        const muse = harness(museRunner(), { ...MuseTestAccount, mechanism: "api_key" });

        const error = await muse.preflight().catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(HarnessCapabilityError);
        expect((error as HarnessCapabilityError).cause).toMatchObject({
            message: expect.stringContaining("api_key")
        });
    });

    it("reports the account that pays and no subscription, because there is none", async () => {
        const runner = museRunner();
        const muse = harness(runner);

        const events = await Array.fromAsync(muse.run(await harnessRequest("muse-billing")));

        expect(lastCompleted(events).result).toMatchObject({
            kind: HarnessKinds.MUSE,
            status: HarnessRunStatuses.SUCCEEDED,
            sessionId: MuseTestValues.SESSION_ID,
            authentication: {
                method: HarnessAuthenticationMethods.META_ACCOUNT,
                subscription: null,
                wallet: expect.stringContaining(MuseTestValues.EMAIL)
            }
        });
    });

    /** A resume the CLI never performed would leave a manifest claiming continuity that never was. */
    it("refuses to resume rather than start a fresh session under a borrowed id", async () => {
        const muse = harness(museRunner());
        const request = await harnessRequest("muse-resume", {
            resumeSessionId: MuseTestValues.SESSION_ID
        });

        await expect(Array.fromAsync(muse.run(request))).rejects.toBeInstanceOf(
            HarnessRequestError
        );
    });

    it("reports a tool call and its result as one call the operator can follow", async () => {
        const runner = museRunner([
            ...museRunStream("done").slice(0, 2),
            museRecord("task.lifecycle.proposed", {
                event: { kind: "proposed", task_id: "task-1", task_kind: "tool.bash" }
            }),
            museRecord("tool.result", {
                call_id: "call-1",
                text: '{"exit_code":0}',
                correlation_facts: { tool_name: "bash", outcome: "success" }
            }),
            ...museRunStream("done").slice(2)
        ]);
        const muse = harness(runner);

        const events = await Array.fromAsync(muse.run(await harnessRequest("muse-tools")));
        const tools = events.filter((event) => event.type === HarnessEventTypes.TOOL);

        expect(tools).toMatchObject([
            { phase: "started", toolName: "bash", callId: "task-1" },
            { phase: "completed", toolName: "bash", callId: "call-1" }
        ]);
    });
});
