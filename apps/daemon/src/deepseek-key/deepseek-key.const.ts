/** Where the lab takes the DeepSeek key, and where it gives it back up. */
export const DEEPSEEK_KEY_ROUTE = "/api/harnesses/deepseek/key";

export const DeepseekKeyError = {
    INVALID_KEY: "A DeepSeek key cannot be empty",
    UNWRITABLE: "The lab could not store the DeepSeek key"
} as const;
