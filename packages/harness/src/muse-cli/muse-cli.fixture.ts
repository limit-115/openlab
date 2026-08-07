import { MuseModels, MusePayloadTypes, MuseStreamKinds } from "#src/muse-cli/muse-cli.const";

export const MuseTestValues = {
    VERSION: "Muse Code 0.1.0 (0.1.0-R708.1)",
    SESSION_ID: "f196612f-8fb1-441e-91b5-9045671603ae",
    RUN_ID: "81dd4fd8-42ef-4074-8afb-cb33c23362c6",
    EMAIL: "operator@example.invalid"
} as const;

/** The envelope every `muse exec --json` line carries, with only the fields the harness reads. */
export function museRecord(
    payloadType: string,
    payload: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
    return {
        schema_version: 1,
        stream: { kind: MuseStreamKinds.SESSION, id: MuseTestValues.SESSION_ID },
        record_type: "event",
        payload_type: payloadType,
        payload_schema_version: 1,
        payload: {
            ...payload,
            run_stream: { kind: MuseStreamKinds.RUN, id: MuseTestValues.RUN_ID }
        }
    };
}

/** A run that started, said one thing and ended, which is the shortest complete Muse stream. */
export function museRunStream(
    finalText: string,
    modelId: string = MuseModels.STANDARD
): readonly Readonly<Record<string, unknown>>[] {
    return [
        museRecord(MusePayloadTypes.RUN_MODEL_CONFIGURED, {
            provider_id: "meta",
            model_id: modelId,
            display_label: modelId,
            source: "startup"
        }),
        museRecord(MusePayloadTypes.RUN_LIFECYCLE_STARTED, { prompt: "Solve the research task" }),
        museRecord(MusePayloadTypes.RUN_TERMINAL_COMPLETED, {
            terminal: "completed",
            text: finalText,
            reason: null
        })
    ];
}
