import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessEffortLevels,
    HarnessKinds,
    HarnessRunStatuses
} from "#src/agent-harness/agent-harness.const";
import {
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/cli-agent-harness/harness-run.fixture";
import {
    captureSuccess,
    type FakeCaptureResult,
    FakeHarnessProcessRunner,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { testEnvironment } from "#src/cli-execution/harness-environment.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import {
    CodexConfigKeys,
    CodexNativeEventTypes,
    CodexProviderFields
} from "#src/codex-cli/codex-cli.const";
import {
    DEEPSEEK_API_KEY_VARIABLE,
    DEEPSEEK_BASE_URL,
    DeepseekProvider,
    DeepseekReasoningEfforts,
    DeepseekSessionDefaults
} from "#src/deepseek-cli/deepseek-cli.const";
import type { DeepseekWallet } from "#src/deepseek-cli/deepseek-credential.types";
import { DeepseekHarness } from "#src/deepseek-cli/deepseek-harness";

const DeepseekTestCliValues = {
    VERSION: "codex-cli 0.146.0",
    SESSION_ID: "deepseek-thread"
} as const;

const DeepseekTestWallet: DeepseekWallet = {
    apiKey: "sk-wallet-key",
    available: true,
    balance: "42.50 USD"
} as const;

/** What `codex login status` prints. The DeepSeek harness reads it for nothing but liveness. */
const CODEX_LOGIN_OUTPUT = "Logged in using ChatGPT";

function successfulRunner(
    captures: readonly FakeCaptureResult[] = [
        captureSuccess(DeepseekTestCliValues.VERSION),
        captureSuccess(CODEX_LOGIN_OUTPUT)
    ]
): FakeHarnessProcessRunner {
    const runner = new FakeHarnessProcessRunner(captures);
    runner.nextStream = streamSuccess([
        {
            type: CodexNativeEventTypes.THREAD_STARTED,
            thread_id: DeepseekTestCliValues.SESSION_ID
        },
        { type: CodexNativeEventTypes.TURN_COMPLETED }
    ]);
    return runner;
}

function harness(wallet: DeepseekWallet | Error = DeepseekTestWallet): DeepseekHarness {
    return new DeepseekHarness({
        runner: successfulRunner(),
        environment: testEnvironment(),
        resolveWallet: async () => {
            if (wallet instanceof Error) {
                throw wallet;
            }
            return wallet;
        }
    });
}

afterEach(removeHarnessRunDirectories);

describe("DeepseekHarness", () => {
    it("points the CLI at DeepSeek and hands it the key through the environment alone", async () => {
        const runner = successfulRunner();
        const deepseek = new DeepseekHarness({
            runner,
            environment: testEnvironment(),
            resolveWallet: async () => DeepseekTestWallet
        });

        const events = await Array.fromAsync(deepseek.run(await harnessRequest("deepseek-run")));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(spawn?.environment).toMatchObject({
            [DEEPSEEK_API_KEY_VARIABLE]: DeepseekTestWallet.apiKey
        });
        const providerField = (field: string): string =>
            `${CodexConfigKeys.MODEL_PROVIDERS}.${DeepseekProvider.ID}.${field}`;
        expect(spawn?.args).toEqual(
            expect.arrayContaining([
                `${CodexConfigKeys.MODEL_PROVIDER}=${JSON.stringify(DeepseekProvider.ID)}`,
                `${providerField(CodexProviderFields.BASE_URL)}=${JSON.stringify(DEEPSEEK_BASE_URL)}`,
                `${providerField(CodexProviderFields.WIRE_API)}=${JSON.stringify(DeepseekProvider.WIRE_API)}`,
                `${providerField(CodexProviderFields.ENV_KEY)}=${JSON.stringify(DEEPSEEK_API_KEY_VARIABLE)}`
            ])
        );
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.DEEPSEEK,
            status: HarnessRunStatuses.SUCCEEDED,
            authentication: {
                method: HarnessAuthenticationMethods.DEEPSEEK_API_KEY,
                subscription: null,
                wallet: DeepseekTestWallet.balance
            }
        });
    });

    /**
     * Every argument is written into the run manifest and is readable in the process table, so a key
     * that reached the command line would outlive the run in two places the operator never chose.
     */
    it("keeps the key out of every argument the run records", async () => {
        const runner = successfulRunner();
        const deepseek = new DeepseekHarness({
            runner,
            environment: testEnvironment(),
            resolveWallet: async () => DeepseekTestWallet
        });

        await Array.fromAsync(deepseek.run(await harnessRequest("deepseek-secret")));

        expect(runner.spawnRequests[0]?.args.join(" ")).not.toContain(DeepseekTestWallet.apiKey);
    });

    it("folds the lab's effort onto a level DeepSeek serves", async () => {
        const runner = successfulRunner();
        const deepseek = new DeepseekHarness({
            runner,
            environment: testEnvironment(),
            resolveWallet: async () => DeepseekTestWallet
        });

        await Array.fromAsync(
            deepseek.run({
                ...(await harnessRequest("deepseek-effort")),
                effort: HarnessEffortLevels.XHIGH
            })
        );

        expect(runner.spawnRequests[0]?.args).toEqual(
            expect.arrayContaining([
                `${CodexConfigKeys.MODEL_REASONING_EFFORT}=${JSON.stringify(DeepseekReasoningEfforts[HarnessEffortLevels.XHIGH])}`
            ])
        );
    });

    it("runs the model DeepSeek serves through Codex when the request names none", async () => {
        const runner = successfulRunner();
        const deepseek = new DeepseekHarness({
            runner,
            environment: testEnvironment(),
            resolveWallet: async () => DeepseekTestWallet
        });

        await Array.fromAsync(deepseek.run(await harnessRequest("deepseek-default-model")));

        expect(runner.spawnRequests[0]?.args).toEqual(
            expect.arrayContaining(["--model", DeepseekSessionDefaults.MODEL])
        );
    });

    /**
     * The credential is wanted three times on the way to a spawned process. Reading it three times
     * would let a key replaced mid-flight leave the manifest naming one wallet while the process
     * spends another, and would spend three calls on DeepSeek before any work begins.
     */
    it("reads the wallet once for a whole run, and again for the next one", async () => {
        let reads = 0;
        /** A run and the preflight after it are two conversations with the CLI, so both are answered. */
        const runner = successfulRunner([
            captureSuccess(DeepseekTestCliValues.VERSION),
            captureSuccess(CODEX_LOGIN_OUTPUT),
            captureSuccess(DeepseekTestCliValues.VERSION),
            captureSuccess(CODEX_LOGIN_OUTPUT)
        ]);
        const deepseek = new DeepseekHarness({
            runner,
            environment: testEnvironment(),
            resolveWallet: async () => {
                reads += 1;
                return DeepseekTestWallet;
            }
        });

        await Array.fromAsync(deepseek.run(await harnessRequest("deepseek-once")));
        const duringOneRun = reads;
        await deepseek.preflight();

        expect(duringOneRun).toBe(1);
        expect(reads).toBe(2);
    });

    it("refuses a wallet DeepSeek will no longer serve before anything is spawned", async () => {
        const deepseek = harness({ ...DeepseekTestWallet, available: false });

        await expect(deepseek.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
    });

    it("refuses when the lab holds no key at all", async () => {
        const deepseek = harness(
            new Error("No DeepSeek key at /home/nobody/.openlab/deepseek.json")
        );

        await expect(deepseek.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
    });
});
