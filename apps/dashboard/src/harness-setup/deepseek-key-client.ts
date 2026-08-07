import { DeepseekKeyStateSchema } from "@openlab/protocol/deepseek-key/deepseek-key.schema";
import type { DeepseekKeyState } from "@openlab/protocol/deepseek-key/deepseek-key.types";

const DEEPSEEK_KEY_ENDPOINT = "/api/harnesses/deepseek/key";

export const deepseekKeyQueryKey = ["lab", "harnesses", "deepseek", "key"] as const;

/** Whether the lab is holding a key. The key itself is never served, so it is never asked for. */
export async function fetchDeepseekKeyState(signal?: AbortSignal): Promise<DeepseekKeyState> {
    const response = await fetch(DEEPSEEK_KEY_ENDPOINT, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    if (!response.ok) {
        throw new Error(`DeepSeek key endpoint returned ${response.status}.`);
    }
    return DeepseekKeyStateSchema.parse(await response.json());
}

export async function saveDeepseekKey(apiKey: string): Promise<DeepseekKeyState> {
    const response = await fetch(DEEPSEEK_KEY_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ api_key: apiKey })
    });
    if (!response.ok) {
        throw new Error(`The lab refused the DeepSeek key with ${response.status}.`);
    }
    return DeepseekKeyStateSchema.parse(await response.json());
}

export async function forgetDeepseekKey(): Promise<DeepseekKeyState> {
    const response = await fetch(DEEPSEEK_KEY_ENDPOINT, {
        method: "DELETE",
        headers: { Accept: "application/json" }
    });
    if (!response.ok) {
        throw new Error(`The lab could not forget the DeepSeek key (${response.status}).`);
    }
    return DeepseekKeyStateSchema.parse(await response.json());
}
