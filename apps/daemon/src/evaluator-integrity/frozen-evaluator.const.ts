export const EvaluatorFileRequirement = {
    MINIMUM_BYTES: 32,
    EXECUTABLE_MODE_MASK: 0o111
} as const;

export const TrivialEvaluatorSource = {
    EMPTY_NODE_SUCCESS: /^(?:#![^\n]*\n)?\s*process\.exit\s*\(\s*0\s*\)\s*;?\s*$/u,
    EMPTY_SHELL_SUCCESS: /^(?:#![^\n]*\n)?\s*(?::|true|exit\s+0)\s*;?\s*$/u
} as const;
