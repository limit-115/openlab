export const EvaluatorFileRequirement = {
    MINIMUM_BYTES: 32,
    EXECUTABLE_MODE_MASK: 0o111
} as const;

/**
 * A precommitted evaluator is written by an agent that afterwards runs unrestricted, so freezing it
 * means taking it out of that agent's workspace entirely rather than trusting the file to sit still.
 */
export const FrozenEvaluatorStore = {
    DIRECTORY: "frozen-evaluators",
    FILE_NAME: "evaluator",
    FILE_MODE: 0o500
} as const;

export const TrivialEvaluatorSource = {
    EMPTY_NODE_SUCCESS: /^(?:#![^\n]*\n)?\s*process\.exit\s*\(\s*0\s*\)\s*;?\s*$/u,
    EMPTY_SHELL_SUCCESS: /^(?:#![^\n]*\n)?\s*(?::|true|exit\s+0)\s*;?\s*$/u
} as const;
